# Privacy, threat model, and limits

**Status:** proof of concept, not a hardened product.

- Screen capture must be started by a real browser user gesture and permission picker. The app cannot and should not silently capture a screen.
- The control-room participants, queue, and feed are local demo objects; they confer no network authority.
- The manual WebRTC lab has no identity/authenticated peer pairing. A person with the exchanged offer/answer may be able to establish a connection. Share signaling privately, never in public tickets or logs.
- The example uses no STUN, TURN, signaling backend, analytics, database or media recording. It loads a Google Fonts CSS stylesheet, however, which causes a request to Google. Remove or self-host fonts before claiming zero external page requests.
- A WebRTC connection encrypts media in transit, but browser/client trust and signaling authenticity still matter.
- SDP/ICE candidates can expose connection metadata. Don't persist or upload them, and don't include them in bug reports.
- Prefer direct LAN use on trusted networks. Browser or router limitations can prevent connections. No NAT traversal or internet sharing promise.
- Stop and disconnect closes the connection and capture tracks in the local app; this does not remotely control the other browser.
- Do not use for regulated/confidential environments or assume any screen capture respects DRM. No protected-media bypass is part of the design.

## Future required controls before public multi-user rooms

Host consent, secure signaling, pairing expiry, replay resistance, peer identity, scoped approvals, revoke and disconnect semantics, rate limiting, threat-model review, and measurable privacy tests.
