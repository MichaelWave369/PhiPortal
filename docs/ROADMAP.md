# Roadmap and evidence gates

## V0.1: Receiver-first proof of concept
- [x] Vite + React responsive control-room UI.
- [x] Pure, unit-testable local state transitions for simulated host handoff.
- [x] Explicitly labeled no-backend simulation and action history.
- [x] Browser WebRTC offer/answer screen streaming experiment with manual signaling.
- [x] CI workflow and GitHub Pages build/deploy job.
- [ ] Confirm CI green on GitHub.
- [ ] Verify two separate computers can complete a LAN WebRTC stream and document environment.
- [ ] Verify GitHub Pages site deployed and accessible.

## V0.2: Consented real sessions
- [ ] Secure short-lived pairing and room identity.
- [ ] Signaling for multiple devices (local relay/node or carefully bounded service).
- [ ] Host approval and presenter queue wired to real sessions, not simulated state.
- [ ] Tests for replay, unauthorized join, expiration, disconnect and revocation.

## V0.3: Appliance
- [ ] HDMI display receiver and autostart kiosk on a supported small device.
- [ ] Local-network discovery and QR entry.
- [ ] Display layout commands and clearly capability-gated HDMI-CEC adapter.
- [ ] Document codec, memory, CPU, Wi-Fi and power test results.

## Research lanes (not release commitments)
- Platform-specific native casting, protected content restrictions, Bluetooth discovery, game-console input/capture, lower-latency gaming, and multi-view compositor.
- Optional PhiStream and NBGPocketMesh integrations only after independent interface and interoperability testing.

Evidence states: concept → prototype → tested on named devices → release candidate. Never collapse these into a single green badge.
