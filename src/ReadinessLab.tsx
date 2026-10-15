import { useMemo, useRef, useState } from 'react';
import { computeChecks, makeSanitizedReceipt } from './readiness';
import type { RelayProbe, Role } from './readiness';

const relayURL = import.meta.env.VITE_SIGNAL_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/signal';

export default function ReadinessLab() {
  const [role, setRole] = useState<Role>('presenter');
  const [probe, setProbe] = useState<RelayProbe>('not-tested');
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState('No relay probe has been run.');
  const pending = useRef<WebSocket | null>(null);

  const checks = useMemo(() => {
    const relay = new URL(relayURL, window.location.href);
    return computeChecks(role, {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      secureContext: window.isSecureContext,
      captureAvailable: Boolean(navigator.mediaDevices?.getDisplayMedia),
      peerAvailable: typeof RTCPeerConnection !== 'undefined',
      socketAvailable: typeof WebSocket !== 'undefined',
      relayScheme: relay.protocol,
      relayHostname: relay.hostname,
    });
  }, [role]);

  const blocked = checks.filter((item) => item.level === 'blocked').length;
  const warnings = checks.filter((item) => item.level === 'warning').length;

  async function checkRelay() {
    if (busy || typeof WebSocket === 'undefined') return;
    pending.current?.close();
    setBusy(true);
    setProbe('not-tested');
    setDetails('Connecting to room relay…');
    try {
      const socket = new WebSocket(relayURL);
      pending.current = socket;
      let complete = false;
      const finish = (status: RelayProbe, explanation: string) => {
        if (complete) return;
        complete = true;
        clearTimeout(timeout);
        socket.onopen = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
        pending.current = null;
        setBusy(false);
        setProbe(status);
        setDetails(explanation);
      };
      const timeout = setTimeout(() => finish('unreachable', 'Relay probe timed out after 5 seconds. Confirm the local service is running and your network allows access.'), 5000);
      socket.onopen = () => finish('reachable', 'WebSocket handshake succeeded. This does NOT verify media or host authorization.');
      socket.onerror = () => finish('unreachable', 'Relay was not reachable. GitHub Pages cannot host it, and HTTPS pages require a WSS endpoint.');
      socket.onclose = () => finish('unreachable', 'Relay closed before the handshake completed.');
    } catch {
      setBusy(false);
      setProbe('unreachable');
      setDetails('Browser blocked the signaling endpoint or the relay URL is invalid.');
    }
  }

  function exportReceipt() {
    const data = makeSanitizedReceipt(role, checks, probe, new Date().toISOString());
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'phiportal-readiness.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  return (
    <section className="readiness-layout">
      <div className="panel">
        <div className="panel-heading"><div><p className="eyebrow">FIRST LIGHT / BROWSER READINESS</p><h2>Device check</h2></div><span className="pill amber">Not a media test</span></div>
        <p className="muted">See which requirements this browser meets before you attempt a room. This check doesn't access your screen, discover other devices, or transmit SDP. The relay probe only runs when you click it.</p>
        <div className="segmented"><button className={role === 'presenter' ? 'selected' : ''} onClick={() => setRole('presenter')}>Sending a screen</button><button className={role === 'receiver' ? 'selected' : ''} onClick={() => setRole('receiver')}>Receiving on display</button></div>
        <div className="check-summary"><span>{blocked} blocked</span><span>{warnings} caution{warnings === 1 ? '' : 's'}</span><span>{checks.length - blocked - warnings} prerequisites present</span></div>
        <div className="readiness-checks">
          {checks.map((item) => <div className={'readiness-check ' + item.level} key={item.id}>
            <span className="readiness-mark" aria-hidden="true">{item.level === 'ready' ? '✓' : item.level === 'blocked' ? '×' : '!'}</span>
            <div><b>{item.title}</b><p>{item.explanation}</p></div>
          </div>)}
        </div>
      </div>
      <div className="panel">
        <div className="panel-heading"><div><p className="eyebrow">LOCAL SIGNALING</p><h2>Relay connection probe</h2></div><span className="pill">{probe}</span></div>
        <p className="muted">A one-click WebSocket handshake check. Does not create a room, send a message, start capture or authenticate a person.</p>
        <button className="primary" disabled={busy} onClick={() => void checkRelay()}>{busy ? 'Checking…' : 'Check relay connection'}</button>
        <p className="room-status" role="status">{details}</p>
        <div className="notice"><b>Two-PC smoke test:</b> On the relay PC, open the presenting page via localhost. On the second PC, open the receiver via the first PC's LAN IP. That keeps screen capture on a secure localhost origin. Use a trusted HTTPS/WSS setup before sending from another PC.</div>
        <div className="notice"><b>No false green:</b> Passing these checks does not demonstrate media transport, latency, device compatibility, playback or authorization. Complete the real-device steps in <code>docs/FIRST_LIGHT.md</code> before claiming those work.</div>
        <button className="secondary" onClick={exportReceipt}>Export privacy-safe diagnostic receipt</button>
        <p className="muted small">The receipt contains only coarse check results and explicitly marks media as unverified. It excludes room codes, device identities, IP addresses and SDP.</p>
      </div>
    </section>
  );
}
