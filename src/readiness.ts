/** Pure device capability checks. These describe prerequisites, not successful live media. */
export type Role = 'receiver' | 'presenter';
export type CheckLevel = 'ready' | 'warning' | 'blocked';
export type RelayProbe = 'not-tested' | 'reachable' | 'unreachable';
export type Check = { id: string; title: string; level: CheckLevel; explanation: string };

export type DeviceContext = {
  protocol: string;
  hostname: string;
  secureContext: boolean;
  captureAvailable: boolean;
  peerAvailable: boolean;
  socketAvailable: boolean;
  relayScheme: string;
  relayHostname: string;
};

export function computeChecks(role: Role, context: DeviceContext): Check[] {
  const checks: Check[] = [];
  const add = (id: string, title: string, level: CheckLevel, explanation: string) =>
    checks.push({ id, title, level, explanation });

  if (context.peerAvailable) add('peer', 'WebRTC', 'ready', 'RTCPeerConnection API exists. This does not prove a peer can connect.');
  else add('peer', 'WebRTC', 'blocked', 'This browser does not expose RTCPeerConnection.');

  if (context.socketAvailable) add('socket', 'WebSocket client', 'ready', 'Browser can attempt a signaling connection.');
  else add('socket', 'WebSocket client', 'blocked', 'This browser cannot connect to the room relay.');

  if (role === 'presenter') {
    if (!context.secureContext) add('capture-secure', 'Capture permission context', 'blocked', 'Screen sharing requires HTTPS or localhost. An HTTP LAN IP is not sufficient.');
    else add('capture-secure', 'Capture permission context', 'ready', 'This page runs in a secure context. A user-initiated browser picker is still required.');
    if (context.captureAvailable) add('capture-api', 'Screen capture API', 'ready', 'getDisplayMedia is present. A capture request can still be declined or fail.');
    else add('capture-api', 'Screen capture API', 'blocked', 'This browser does not expose getDisplayMedia; many mobile browsers lack whole-screen sharing.');
  } else if (context.hostname === 'localhost' || context.hostname === '127.0.0.1' || context.hostname === '[::1]') {
    add('qr-reachability', 'QR link from other devices', 'warning', 'A room QR generated on localhost cannot be opened from a different device. Use a LAN-reachable host URL for the receiver.');
  }

  if (context.protocol === 'https:' && context.relayScheme !== 'wss:') {
    add('relay-security', 'Signaling transport', 'blocked', 'HTTPS sites cannot safely use an insecure ws:// signaling endpoint.');
  } else if (context.relayScheme === 'ws:') {
    add('relay-security', 'Signaling transport', 'warning', 'Plain WS sends room code and SDP metadata without transport encryption. Use only on a trusted test LAN.');
  } else add('relay-security', 'Signaling transport', 'ready', 'WSS encrypts signaling; the relay identity and certificate still need verification.');

  if (/(^|\.)github\.io$/.test(context.relayHostname)) {
    add('relay-location', 'Room relay host', 'blocked', 'GitHub Pages hosts only static files. Run a local Node relay and configure a reachable endpoint.');
  } else {
    add('relay-location', 'Room relay host', 'warning', 'Relay address is configured but reachability is not yet verified. Use the test button.');
  }
  return checks;
}

/** A deliberately minimal receipt; never copy URLs, local IPs, SDP, names, or room tokens. */
export function makeSanitizedReceipt(
  role: Role,
  checks: Check[],
  relay: RelayProbe,
  timestamp: string,
) {
  return {
    schema: 'phiportal.device-readiness.v1',
    timestamp,
    role,
    relay,
    status: 'UNVERIFIED_MEDIA',
    checks: checks.map((check) => ({ id: check.id, level: check.level })),
    note: 'Capability checks and relay probing are not evidence of a successful media stream.',
  };
}
