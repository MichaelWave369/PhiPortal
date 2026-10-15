import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { createLocalPeer, gatherLocalCandidates } from './peer';

type Mode = 'receiver' | 'presenter';
type Guest = { guestId: string; name: string };
type Wire = {
  type: string;
  code?: string;
  expiresAt?: number;
  guestId?: string | null;
  name?: string | null;
  message?: string;
  signal?: RTCSessionDescriptionInit;
  activeId?: string | null;
};

const initialJoinCode = new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase() || '';
const relayURL = import.meta.env.VITE_SIGNAL_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/signal';

function publish(ws: WebSocket | null, event: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
}
function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export default function RoomLab() {
  const [mode, setMode] = useState<Mode>(initialJoinCode ? 'presenter' : 'receiver');
  const [connectState, setConnectState] = useState('Disconnected');
  const [status, setStatus] = useState('Create a room on the display, or enter a code on a presenting device.');
  const [error, setError] = useState('');
  const [code, setCode] = useState(initialJoinCode);
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('Guest');
  const [pending, setPending] = useState<Guest[]>([]);
  const [active, setActive] = useState<Guest | null>(null);
  const [joined, setJoined] = useState(false);
  const [approved, setApproved] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [qr, setQr] = useState('');
  const socket = useRef<WebSocket | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const media = useRef<MediaStream | null>(null);
  const senderVideo = useRef<HTMLVideoElement | null>(null);
  const receiverVideo = useRef<HTMLVideoElement | null>(null);
  const mounted = useRef(true);

  const link = roomCode ? new URL(import.meta.env.BASE_URL + '?join=' + encodeURIComponent(roomCode), window.location.origin).href : '';

  useEffect(() => {
    let keep = true;
    if (!link) { setQr(''); return; }
    QRCode.toDataURL(link, { width: 240, margin: 2, color: { dark: '#091729', light: '#ffffff' } })
      .then((uri) => { if (keep) setQr(uri); })
      .catch(() => { if (keep) setQr(''); });
    return () => { keep = false; };
  }, [link]);

  function cleanupMedia() {
    peer.current?.close();
    peer.current = null;
    stopTracks(media.current);
    media.current = null;
    if (senderVideo.current) senderVideo.current.srcObject = null;
    if (receiverVideo.current) receiverVideo.current.srcObject = null;
    if (mounted.current) setStreaming(false);
  }

  function disconnect() {
    cleanupMedia();
    if (socket.current) {
      socket.current.onclose = null;
      socket.current.close();
      socket.current = null;
    }
    setConnectState('Disconnected');
    setRoomCode('');
    setPending([]);
    setActive(null);
    setJoined(false);
    setApproved(false);
    setError('');
    setStatus('Disconnected. All local media tracks are stopped.');
  }

  useEffect(() => () => {
    mounted.current = false;
    peer.current?.close();
    stopTracks(media.current);
    socket.current?.close();
  }, []);

  async function answerOffer(guestId: string, signal: RTCSessionDescriptionInit) {
    cleanupMedia();
    try {
      if (signal.type !== 'offer' || typeof signal.sdp !== 'string') throw new Error('Invalid sender offer.');
      const connection = createLocalPeer();
      peer.current = connection;
      connection.ontrack = (event) => {
        if (receiverVideo.current) {
          receiverVideo.current.srcObject = event.streams[0] ?? new MediaStream([event.track]);
          void receiverVideo.current.play().catch(() => setStatus('Tap the video to enable playback on this display.'));
        }
        setStreaming(true);
        setStatus('Receiving an approved presenter stream.');
      };
      await connection.setRemoteDescription(signal);
      await connection.setLocalDescription(await connection.createAnswer());
      const complete = await gatherLocalCandidates(connection);
      if (peer.current !== connection) return;
      publish(socket.current, { type: 'signal', guestId, signal: connection.localDescription });
      if (!complete) setStatus('Answer sent with incomplete ICE gathering; connection may fail.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not receive offer.');
      cleanupMedia();
    }
  }

  async function applyAnswer(signal: RTCSessionDescriptionInit) {
    try {
      if (!peer.current || peer.current.signalingState !== 'have-local-offer' || signal.type !== 'answer')
        throw new Error('Unexpected answer without a pending offer.');
      await peer.current.setRemoteDescription(signal);
      setStatus('Answer applied. Waiting for direct LAN stream connection.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not apply answer.'); }
  }

  function handleEvent(message: Wire) {
    switch (message.type) {
      case 'room-created':
        setRoomCode(message.code || '');
        setStatus('Room ready. Guests need explicit receiver approval before they can stream.');
        break;
      case 'joined-pending':
        setJoined(true);
        setStatus('Request sent. Waiting for the receiver to approve this device.');
        break;
      case 'join-request':
        if (message.guestId && message.name) {
          setPending((old) => old.some((item) => item.guestId === message.guestId) ? old : [...old, { guestId: message.guestId!, name: message.name! }]);
          setStatus('Someone is requesting permission to present.');
        }
        break;
      case 'approved':
        setApproved(true);
        setStatus('Approved! Click Start screen sharing and choose what to show.');
        break;
      case 'rejected':
        setStatus('The receiver declined your request.');
        setApproved(false);
        break;
      case 'revoked':
        setApproved(false);
        cleanupMedia();
        setStatus('The receiver ended your presenter permission. You can request again.');
        break;
      case 'active':
        cleanupMedia();
        setActive(message.guestId && message.name ? { guestId: message.guestId, name: message.name } : null);
        if (message.guestId) setStatus(message.name + ' is approved to present.');
        else setStatus('Display is available.');
        break;
      case 'guest-left':
        setPending((old) => old.filter((item) => item.guestId !== message.guestId));
        if (!message.activeId) { cleanupMedia(); setActive(null); }
        setStatus('A guest disconnected.');
        break;
      case 'share-stopped':
        cleanupMedia();
        setStatus('The presenter stopped sharing their screen.');
        break;
      case 'signal':
        if (!message.signal || typeof message.signal.sdp !== 'string') return;
        if (mode === 'receiver' && message.signal.type === 'offer' && message.guestId)
          void answerOffer(message.guestId, message.signal);
        else if (mode === 'presenter' && message.signal.type === 'answer')
          void applyAnswer(message.signal);
        break;
      case 'room-closed':
        disconnect();
        setStatus('The receiver closed this room.');
        break;
      case 'error':
        setError(message.message || 'Room command failed.');
        break;
    }
  }

  function connect() {
    if (socket.current) disconnect();
    setError('');
    setConnectState('Connecting');
    let ws: WebSocket;
    try { ws = new WebSocket(relayURL); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to relay.');
      setConnectState('Disconnected');
      return;
    }
    socket.current = ws;
    ws.onopen = () => {
      setConnectState('Connected to relay');
      publish(ws, mode === 'receiver'
        ? { type: 'create' }
        : { type: 'join', code: code.trim().toUpperCase(), name: name.trim() });
    };
    ws.onmessage = (event) => {
      try { handleEvent(JSON.parse(event.data) as Wire); }
      catch { setError('Received an invalid relay message.'); }
    };
    ws.onerror = () => setError('Cannot reach the local relay. Run npm run relay locally. HTTPS pages require an HTTPS/WSS relay.');
    ws.onclose = () => {
      if (socket.current === ws) {
        socket.current = null;
        cleanupMedia();
        setConnectState('Disconnected');
        setRoomCode('');
        setJoined(false);
        setApproved(false);
        setActive(null);
        setPending([]);
        setStatus('The connection to the local relay closed.');
      }
    };
  }

  async function shareScreen() {
    if (!approved || !socket.current || socket.current.readyState !== WebSocket.OPEN) return;
    setError('');
    cleanupMedia();
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || !window.isSecureContext)
        throw new Error('Screen capture requires HTTPS or localhost on this device. Opening an HTTP LAN address on another laptop is not a secure context.');
      // Invoked by explicit user click. Browser always owns the capture picker.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      media.current = stream;
      if (senderVideo.current) senderVideo.current.srcObject = stream;
      const connection = createLocalPeer();
      peer.current = connection;
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setStatus('Direct media stream connected.');
        else if (connection.connectionState === 'failed') setError('Direct peer connection failed. Check LAN isolation and ICE limitations.');
      };
      stream.getTracks().forEach((track) => {
        connection.addTrack(track, stream);
        track.addEventListener('ended', stopSharing, { once: true });
      });
      await connection.setLocalDescription(await connection.createOffer());
      const complete = await gatherLocalCandidates(connection);
      if (peer.current !== connection) return;
      publish(socket.current, { type: 'signal', signal: connection.localDescription });
      setStreaming(true);
      setStatus(complete ? 'Offer sent to receiver automatically.' : 'Offer sent; ICE gathering incomplete.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not capture screen.');
      cleanupMedia();
    }
  }

  function stopSharing() {
    cleanupMedia();
    publish(socket.current, { type: 'stop-share' });
    setStatus('Your screen share stopped.');
  }

  function approveGuest(guestId: string) {
    publish(socket.current, { type: 'approve', guestId });
    setPending((old) => old.filter((guest) => guest.guestId !== guestId));
  }

  function rejectGuest(guestId: string) {
    publish(socket.current, { type: 'reject', guestId });
    setPending((old) => old.filter((guest) => guest.guestId !== guestId));
  }

  function chooseMode(next: Mode) {
    disconnect();
    setMode(next);
    setStatus('Choose how this device will participate.');
  }

  return (
    <section className="room-pairing">
      <div className="room-intro">
        <div><p className="eyebrow">EXPERIMENT / CONSENTED LAN SESSION</p><h2>Room pairing and handoff</h2></div>
        <span className="pill amber">Requires local relay</span>
      </div>
      <p className="muted">Make the TV a receiver, scan its QR code to request access, approve the guest, and send real WebRTC media without manually pasting offers and answers. This is an unverified local-network prototype, not a public internet service.</p>
      <div className="segmented room-role" aria-label="Choose device role">
        <button className={mode === 'receiver' ? 'selected' : ''} disabled={connectState !== 'Disconnected'} onClick={() => chooseMode('receiver')}>This is the TV / receiver</button>
        <button className={mode === 'presenter' ? 'selected' : ''} disabled={connectState !== 'Disconnected'} onClick={() => chooseMode('presenter')}>This is my presenting device</button>
      </div>
      <div className="room-grid">
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">LOCAL CONTROL PLANE</p><h2>{mode === 'receiver' ? 'Host a display room' : 'Join a display'}</h2></div><span className="pill">{connectState}</span></div>
          {mode === 'presenter' && (
            <div className="room-inputs">
              <label htmlFor="room-code">Room code</label>
              <input id="room-code" value={code} maxLength={16} onChange={(event) => setCode(event.target.value.toUpperCase())} disabled={connectState !== 'Disconnected'} placeholder="Scan QR or enter code" />
              <label htmlFor="guest-name">Your display name</label>
              <input id="guest-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} disabled={connectState !== 'Disconnected'} />
            </div>
          )}
          <div className="room-buttons">
            {connectState === 'Disconnected'
              ? <button className="primary" onClick={connect} disabled={mode === 'presenter' && (!code.trim() || !name.trim())}>{mode === 'receiver' ? 'Create room' : 'Request to join'}</button>
              : <button className="danger-button" onClick={disconnect}>Disconnect / close room</button>}
          </div>
          {mode === 'receiver' && roomCode && (
            <div className="qr-area">
              {qr ? <img src={qr} alt={'Join PhiPortal room ' + roomCode + ' QR code'} /> : <p>Preparing QR…</p>}
              <div><p className="eyebrow">JOIN CODE</p><strong>{roomCode}</strong><p className="muted">Scan the code from another device. Host approval is still required.</p>
                <button className="secondary" onClick={() => void navigator.clipboard.writeText(link).then(() => setStatus('Room link copied.')).catch(() => setError('Clipboard denied. Copy the link manually.'))}>Copy room link</button>
                <input readOnly aria-label="Room join link" value={link} onFocus={(event) => event.target.select()} /></div>
            </div>
          )}
          {mode === 'receiver' && roomCode && window.location.hostname === 'localhost' && <p className="warning-text">This receiver URL uses localhost. QR links pointing to localhost won't reach another device. Open the receiver using the relay machine's LAN IP before creating a room.</p>}
          {mode === 'receiver' && (
            <div className="room-requests">
              <h3>Guest requests</h3>
              {!pending.length && <p className="muted">No pending requests.</p>}
              {pending.map((guest) => <div className="request-row" key={guest.guestId}><span>{guest.name}</span><button className="primary" onClick={() => approveGuest(guest.guestId)}>Approve</button><button className="secondary" onClick={() => rejectGuest(guest.guestId)}>Decline</button></div>)}
              {active && <div className="active-row"><span>Approved presenter: <b>{active.name}</b></span><button className="secondary" onClick={() => publish(socket.current, { type: 'revoke' })}>Revoke access</button></div>}
            </div>
          )}
          {mode === 'presenter' && joined && (
            <div className="room-requests">
              <h3>My presentation</h3>
              {approved ? <p className="muted">Receiver approved. Your browser will ask which window or screen to share.</p> : <p className="muted">Awaiting approval, or request access again after being revoked.</p>}
              <div className="room-buttons">
                <button className="primary" disabled={!approved || streaming} onClick={shareScreen}>Start screen sharing</button>
                <button className="secondary" disabled={!streaming} onClick={stopSharing}>Stop sharing</button>
                <button className="secondary" disabled={approved} onClick={() => publish(socket.current, { type: 'request' })}>Request again</button>
              </div>
            </div>
          )}
          <p className="room-status" role="status">{status}</p>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">DISPLAY OUTPUT</p><h2>{mode === 'receiver' ? 'Incoming stream' : 'My capture preview'}</h2></div><span className="pill">{streaming ? 'Streaming' : 'Standby'}</span></div>
          <div className="video-stage">
            <video autoPlay playsInline ref={receiverVideo} className={mode === 'receiver' ? '' : 'hidden'} />
            <video autoPlay playsInline muted ref={senderVideo} className={mode === 'presenter' ? '' : 'hidden'} />
            {!streaming && <p className="video-hint">Approved video will appear here once peers connect.</p>}
          </div>
          <div className="notice"><b>Permission first.</b> Guests join pending; the receiver must approve them. Screen capture also requires the sender's separate browser permission. Closing a room stops this prototype's local peer connection.</div>
          <div className="notice"><b>Prototype limitations.</b> Plain HTTP/WS is not suitable for untrusted networks. Capture on a remote device needs HTTPS or localhost; native mobile mirroring and consoles are not supported. WebRTC may fail across isolated or routed networks.</div>
          <p className="muted small">Connected relay: <code>{relayURL}</code></p>
        </div>
      </div>
    </section>
  );
}
