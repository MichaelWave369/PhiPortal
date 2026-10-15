# PhiPortal architecture

## Current execution paths

**Demo:** React control-room queue and handoff state runs in one browser, not on a network.

**Manual media lab:** Two browsers copy WebRTC offer/answer JSON between each other. No discovery or server.

**LAN room experiment (PR #2):** Receiver creates a room using an ephemeral Node/WebSocket relay. Guests join by a QR/link or manually entered code. Join is pending until the receiver approves a specific server-generated guest ID. Only the active approved guest can relay an SDP offer and only the receiver can answer it. Screen capture always requires a separate explicit user gesture and browser permission. SDP is relayed automatically, then video travels over WebRTC. No user media is stored by the relay.

## Trust boundaries

- Receiver authority is bound to the **creating WebSocket connection**, not to guest-supplied IDs, UI labels, or room codes.
- Guest access is permission to *request*; approval is explicit; browser display-capture permission remains independent.
- Room code is generated with secure random bytes, lasts 15 minutes for new joins, and is not long-term identity. Client identity is not verified.
- Multiple connections can request entry, but the relay forwards offers only for the currently approved presenter.
- Host revocation immediately disables future signaling. Client-side peer cleanup is best effort; not a substitute for hardened remote media authorization.
- Origin checks and limited attempt counts are defense in depth, not a complete LAN threat model.
- Default transport is insecure HTTP/WS. Intended only for trusted experimental local networks; production requires HTTPS/WSS, better authorization, rate limits and abuse prevention.
- LAN discovery, NAT traversal, certificate provisioning, device compatibility and reconnect behavior remain future engineering work.

## Appliance direction

A later HDMI appliance would run this receiver/control-plane logic on a Pi-class node, expose a clear display room UI, and provide QR entry. It should maintain scope-limited commands, host control, capability-based HDMI-CEC, privacy-preserving event receipts, and deterministic test gates.

PhiStream, NBGPocketMesh, LightBridge and PocketBrain Tiny are **integration ideas**, not current implementation dependencies.
