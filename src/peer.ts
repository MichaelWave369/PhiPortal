/**
 * Opt-in, manually signaled WebRTC proof of concept.
 *
 * Uses host candidates only, with no STUN/TURN service.
 * Therefore peers usually must be on the same reachable local network.
 * SDP is sensitive session material: exchange privately.
 */
export type Signal = RTCSessionDescriptionInit;

export function decodeSignal(text: string, expected: RTCSdpType): Signal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Signal must be valid JSON copied from the other browser.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid signal object.');
  const value = parsed as Record<string, unknown>;
  if (value.type !== expected || typeof value.sdp !== 'string' || !value.sdp) {
    throw new Error('Expected a WebRTC ' + expected + ' with a non-empty SDP.');
  }
  if (value.sdp.length > 300_000) throw new Error('Signal is unexpectedly large.');
  return { type: expected, sdp: value.sdp };
}

export function createLocalPeer(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: [] });
}

export async function gatherLocalCandidates(peer: RTCPeerConnection): Promise<boolean> {
  if (peer.iceGatheringState === 'complete') return true;
  return new Promise<boolean>((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    const done = (complete: boolean) => {
      clearTimeout(timeout);
      peer.removeEventListener('icegatheringstatechange', check);
      resolve(complete);
    };
    const check = () => {
      if (peer.iceGatheringState === 'complete' || peer.signalingState === 'closed') {
        done(peer.iceGatheringState === 'complete');
      }
    };
    peer.addEventListener('icegatheringstatechange', check);
    timeout = setTimeout(() => done(peer.iceGatheringState === 'complete'), 15_000);
    check();
  });
}
