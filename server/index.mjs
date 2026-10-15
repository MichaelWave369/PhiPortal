import http from 'node:http';
import https from 'node:https';
import { readFile, readFileSync, stat } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createRoomRegistry } from './rooms.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(projectRoot, 'dist');
const port = Number(process.env.PHIPORTAL_PORT || 8787);
const bind = process.env.PHIPORTAL_BIND || '0.0.0.0';
const keyPath = process.env.PHIPORTAL_TLS_KEY;
const certPath = process.env.PHIPORTAL_TLS_CERT;
if (Boolean(keyPath) !== Boolean(certPath)) throw new Error('Supply both PHIPORTAL_TLS_KEY and PHIPORTAL_TLS_CERT, or neither.');
const tls = keyPath && certPath ? { key: readFileSync(keyPath), cert: readFileSync(certPath) } : null;
const allowedOrigins = new Set((process.env.PHIPORTAL_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function staticHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end('Method not allowed'); return;
  }
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(302, { Location: '/PhiPortal/' + url.search }); res.end(); return;
  }
  if (!url.pathname.startsWith('/PhiPortal/')) {
    res.writeHead(404); res.end('Not found'); return;
  }
  let relative;
  try { relative = decodeURIComponent(url.pathname.slice('/PhiPortal/'.length)); }
  catch { res.writeHead(400); res.end('Bad path'); return; }
  if (relative.includes('\\') || relative.includes('\0')) {
    res.writeHead(400); res.end('Bad path'); return;
  }
  const target = resolve(dist, relative || 'index.html');
  if (target !== resolve(dist, 'index.html') && !target.startsWith(dist + sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  stat(target, (err, info) => {
    if (err || !info.isFile()) {
      res.writeHead(404); res.end('Build first: npm run build'); return;
    }
    readFile(target, (readErr, data) => {
      if (readErr) { res.writeHead(500); res.end('Read error'); return; }
      res.writeHead(200, {
        'Content-Type': mime[extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}

const app = tls ? https.createServer(tls, staticHandler) : http.createServer(staticHandler);
const wss = new WebSocketServer({ noServer: true, maxPayload: 150_000, perMessageDeflate: false });
const registry = createRoomRegistry();
const rate = new Map();
const RATE_PERIOD_MS = 60_000;
const MAX_OPENS_PER_MINUTE = 40;

function allowedOrigin(req) {
  if (!req.headers.origin) return false;
  if (allowedOrigins.has(req.headers.origin)) return true;
  try {
    const origin = new URL(req.headers.origin);
    return origin.host === req.headers.host &&
      ((tls && origin.protocol === 'https:') || (!tls && origin.protocol === 'http:'));
  } catch { return false; }
}
app.on('upgrade', (req, socket, head) => {
  if (req.url?.split('?')[0] !== '/signal' || !allowedOrigin(req)) { socket.destroy(); return; }
  const ip = req.socket.remoteAddress || 'unknown';
  const current = Date.now();
  const recent = (rate.get(ip) || []).filter((time) => current - time < RATE_PERIOD_MS);
  if (recent.length >= MAX_OPENS_PER_MINUTE) { socket.destroy(); return; }
  recent.push(current); rate.set(ip, recent);
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
});
wss.on('connection', (ws) => {
  let alive = true;
  ws.on('pong', () => { alive = true; });
  ws.on('message', (raw, isBinary) => {
    if (isBinary) { ws.close(1003, 'Text messages only'); return; }
    try { registry.handle(ws, JSON.parse(raw.toString())); }
    catch { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON.' })); }
  });
  ws.on('close', () => registry.disconnect(ws));
  ws.isAlive = () => alive;
  ws.markPing = () => { alive = false; ws.ping(); };
});
const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    if (!client.isAlive()) { client.terminate(); continue; }
    client.markPing();
  }
}, 30_000);
wss.on('close', () => clearInterval(heartbeat));
app.listen(port, bind, () => {
  console.log('PhiPortal local relay: ' + (tls ? 'https' : 'http') + '://' + bind + ':' + port + '/PhiPortal/');
  console.log('Room state lives in memory. Use only on a trusted LAN; HTTPS/WSS is recommended.');
});
