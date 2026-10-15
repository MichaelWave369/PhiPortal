# Evidence-based roadmap

## V0.1 (merged)
- [x] React/Vite responsive control room (local simulation).
- [x] Browser WebRTC manual offer/answer lab, no automatic pairing.
- [x] Test and build workflow in GitHub Actions.
- [ ] Two-device streaming verified on named machines and network.
- [ ] GitHub Pages deployment externally verified.

## V0.2 (PR #2 candidate)
- [x] Ephemeral, in-memory Node/WebSocket room relay and approval protocol.
- [x] Receiver room UI with short-lived code and QR join link.
- [x] Presenter join, approval-gated automatic offer/answer WebRTC signaling.
- [x] Host revoke, peer cleanup, room closure and protocol tests.
- [ ] CI and TypeScript build pass for PR #2.
- [ ] Physical two-device streaming test; record OS/browser/network.
- [ ] Trusted HTTPS/WSS and origin/permission testing.
- [ ] Abuse resistance, threat model and security review.

## V0.3 proposal
- Single installer or native service with secure local endpoint / paired TLS.
- Wi-Fi discovery and robust expiring sessions.
- HDMI kiosk on Pi hardware; interoperability and performance tests.
- Optional CEC command adapter with capabilities and user confirmation.

## Separate research
Platform-native AirPlay, Miracast, Google Cast and console support are distinct compatibility lanes, not v0.2 features. PhiStream and NBGPocketMesh remain integration candidates, not implemented dependencies.

Milestone states: concept -> source exists -> CI verified -> real devices tested -> secure enough for intended use -> release.

## V0.3: First Light preparation
- [x] QR join deep link selects the real room UI.
- [x] Browser and relay prerequisite diagnostics; privacy-safe receipt without SDP, names, URLs or IPs.
- [x] Receiver playback controls and clearer denied-join behavior.
- [x] Documented two-computer Windows smoke test.
- [ ] GitHub Actions build for PR #3 green.
- [ ] **Human-performed two-device media test with observed video** (not inferred from CI).
- [ ] Trusted HTTPS/WSS client onboarding on separate machines.
