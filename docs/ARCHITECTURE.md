# PhiPortal architecture

## Layers

1. **Sender**: browser screen capture using getDisplayMedia with a browser-owned permission prompt. Future sender adapters may use platform-native mirroring.
2. **Transport**: v0.1 uses RTCPeerConnection with manual JSON SDP exchange. ICE has no configured STUN/TURN servers; no server component exists.
3. **Receiver**: browser video element renders the incoming MediaStream.
4. **Control plane**: the current React room is a local simulation, deliberately NOT connected to the peer data plane. A future real control plane needs identity, scoped permissions, membership, handoff grants, expiration, and audit events.
5. **Hardware adapter**: future optional Pi or equivalent device provides HDMI output. HDMI-CEC needs explicit capability probing and opt-in commands; not every display supports every command.

## Interfaces proposed for later design

- Presence: local discovery with user-visible identity; no silent automatic joins.
- Pairing: short-lived codes or QR, cryptographically bound to a single room.
- Authority: host approval before a new peer may put media on the receiver; guest permission never means remote control of a guest's device.
- Session ledger: event sequence, timestamps, role/actor, command, outcome, scoped authority, and retention limits; avoid collecting media or sensitive SDP.
- Stream selection: exactly one active presenter for MVP, then opt-in multi-view, with explicit session lifecycle.
- Compatibility: feature matrix records **verified** devices, tested OS/browser, timing and limitations. Experimental adapters are not marked working without independent test.

## Planned integration candidates

PhiStream, NBGPocketMesh, LightBridge and PocketBrain Tiny are *possible future interfaces*, not bundled dependencies or working integrations. Prefer separate adapters with minimal permissions and independent tests.

## Not a universal KVM

PhiPortal does not promise to act as a universal graphics input, defeat DRM, intercept devices, or grant remote keyboard/mouse control. The first real goal is explicit opt-in screen video sharing and host-authorized selection.
