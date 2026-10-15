import { useEffect, useRef, useState } from 'react';
import { createLocalPeer, decodeSignal, gatherLocalCandidates } from './peer';

type Role = 'presenter' | 'receiver';

export default function PeerLab() {
  const [role, setRole] = useState<Role>('presenter');
  const [incoming, setIncoming] = useState('');
  const [outgoing, setOutgoing] = useState('');
  const [state, setState] = useState('Idle');
  const [connection, setConnection] = useState('new');
  const [error, setError] = useState('');
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const live = useRef(true);

  function stop() {
    live.current = false;
    if (pc.current) { pc.current.close(); pc.current = null; }
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setConnection('closed');
    setOutgoing('');
    setState('Stopped');
  }

  useEffect(() => {
    return () => {
      live.current = false;
      pc.current?.close();
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function attachPeer(peer: RTCPeerConnection) {
    pc.current = peer;
    peer.onconnectionstatechange = () => setConnection(peer.connectionState);
    peer.ontrack = (event) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      }
      setState('Remote media received');
    };
  }

  async function makeOffer() {
    stop();
    live.current = true;
    setError('');
    setIncoming('');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('This browser cannot capture its screen. Use desktop Chrome/Edge/Firefox on HTTPS or localhost.');
      }
      // Directly invoked from a click. The browser must show its own permission picker.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (!live.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      const peer = createLocalPeer();
      attachPeer(peer);
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
        track.addEventListener('ended', () => stop(), { once: true });
      });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const complete = await gatherLocalCandidates(peer);
      if (!live.current) return;
      setOutgoing(JSON.stringify(peer.localDescription, null, 2));
      setState(complete ? 'Offer ready: send it privately to the receiver' : 'Offer ready (ICE collection incomplete; retry if needed)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start capture.');
      stop();
    }
  }

  async function makeAnswer() {
    stop();
    live.current = true;
    setError('');
    try {
      const offer = decodeSignal(incoming, 'offer');
      const peer = createLocalPeer();
      attachPeer(peer);
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      const complete = await gatherLocalCandidates(peer);
      if (!live.current) return;
      setOutgoing(JSON.stringify(peer.localDescription, null, 2));
      setState(complete ? 'Answer ready: send it privately to the presenter' : 'Answer ready (ICE collection incomplete; retry if needed)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not accept offer.');
      stop();
    }
  }

  async function applyAnswer() {
    try {
      if (!pc.current || pc.current.signalingState !== 'have-local-offer') {
        throw new Error('First start a screen share and generate an offer.');
      }
      await pc.current.setRemoteDescription(decodeSignal(incoming, 'answer'));
      setError('');
      setState('Answer applied. Waiting for direct peer connection…');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not apply answer.');
    }
  }

  async function copySignal() {
    try {
      await navigator.clipboard.writeText(outgoing);
      setState('Signal copied. Transfer it privately to the other device.');
    } catch {
      setError('Clipboard unavailable. Select and manually copy the signal text.');
    }
  }

  function chooseRole(next: Role) {
    stop();
    setRole(next);
    setIncoming('');
    setError('');
    setState('Idle');
  }

  return (
    <section className="lab-grid">
      <div className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">EXPERIMENT / LIVE MEDIA</p><h2>Peer-to-peer display lab</h2></div>
          <span className="pill amber">Manual handshake</span>
        </div>
        <p className="muted">This tab performs real browser screen capture and WebRTC streaming. It does not use a cloud relay or automatic discovery. Both browsers generally need to be on the same reachable LAN.</p>
        <div className="segmented" aria-label="Choose your device role">
          <button className={role === 'presenter' ? 'selected' : ''} onClick={() => chooseRole('presenter')}>I am presenting</button>
          <button className={role === 'receiver' ? 'selected' : ''} onClick={() => chooseRole('receiver')}>I am receiving</button>
        </div>
        {role === 'presenter' ? (
          <div className="instructions">
            <p><b>1.</b> Click Start sharing and choose a screen or window in the browser prompt.</p>
            <p><b>2.</b> Copy the generated offer to the receiving browser.</p>
            <p><b>3.</b> Paste the receiver's answer below and click Apply answer.</p>
            <button className="primary" onClick={makeOffer}>Start sharing</button>
          </div>
        ) : (
          <div className="instructions">
            <p><b>1.</b> Paste the presenter's offer into the incoming signal field.</p>
            <p><b>2.</b> Click Generate answer, then copy your answer back to the presenter.</p>
            <p><b>3.</b> The video appears here once WebRTC connects.</p>
            <button className="primary" onClick={makeAnswer}>Generate answer</button>
          </div>
        )}
        <label className="field-label" htmlFor="outgoing">My outgoing {role === 'presenter' ? 'offer' : 'answer'}</label>
        <textarea id="outgoing" aria-label="Outgoing signaling JSON" rows={5} readOnly value={outgoing} placeholder="Generated after starting the handshake" />
        <button className="secondary" disabled={!outgoing} onClick={copySignal}>Copy outgoing signal</button>
        <label className="field-label" htmlFor="incoming">Paste incoming {role === 'presenter' ? 'answer' : 'offer'}</label>
        <textarea id="incoming" rows={5} value={incoming} onChange={(event) => setIncoming(event.target.value)} placeholder="Paste JSON received privately from the other browser" />
        {role === 'presenter' && <button className="secondary" disabled={!incoming} onClick={applyAnswer}>Apply answer</button>}
        <button className="danger-button" onClick={stop}>Stop and disconnect</button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="panel">
        <div className="panel-heading"><div><p className="eyebrow">STREAM PREVIEW</p><h2>{role === 'presenter' ? 'Your capture' : 'Incoming display'}</h2></div><span className="pill">{connection}</span></div>
        <div className="video-stage">
          <video ref={localVideo} autoPlay muted playsInline className={role === 'presenter' ? '' : 'hidden'} />
          <video ref={remoteVideo} autoPlay playsInline className={role === 'receiver' ? '' : 'hidden'} />
          {connection !== 'connected' && <p className="video-hint">{role === 'presenter' ? 'Choose a screen to preview it here.' : 'Incoming video appears after the handshake completes.'}</p>}
        </div>
        <p className="status-text"><span className="status-dot" /> {state}</p>
        <div className="notice"><b>Privacy boundary.</b> Your browser explicitly asks what to share. No automatic recording or uploads are implemented. Signaling text contains network details and must be exchanged privately. This experimental peer stream has no pairing authentication; do not use it for sensitive content.</div>
        <div className="notice"><b>Compatibility boundary.</b> Browser screen capture may be unavailable on phones, consoles, or protected media. Some routers and Wi-Fi isolation modes block direct peers. TURN relays, trusted join codes and native casting are future milestones.</div>
      </div>
    </section>
  );
}
