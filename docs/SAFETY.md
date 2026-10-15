# Safety and privacy

**Status: experimental software, not a secure commercial casting appliance.**

- The v0.1 simulated room is not connected to devices. The v0.1 WebRTC lab exchanges SDP by hand.
- The v0.2 Node relay stores ephemeral room and guest state in RAM. It does not record, upload, or persist screen media. Signaling messages are temporarily processed by the relay.
- The receiver creates the room. Guests join pending and require host approval. A room code grants the right to request, not to present.
- The relay enforces host-only approval, host-only answers and active-guest-only offers. These checks are not a complete authorization/audit system.
- Screen capture is started by a deliberate user click and browser-owned permission prompt. Neither host approval nor possession of a code silently turns on capture.
- Room joins expire after 15 minutes; established streams may continue beyond this window until explicitly stopped or disconnected.
- The default HTTP/WS server is **unencrypted**. It leaks signaling metadata and join codes to observers on the LAN. Do not use it on public/untrusted networks or with sensitive material. Use trusted HTTPS/WSS for anything beyond a throwaway demonstration.
- No TURN/STUN servers are configured. ICE and network isolation can make streams fail. Protected playback, mobile whole-screen mirroring, consoles, remote input control and DRM bypass are outside scope.
- The relay checks browser WebSocket origins, but malicious clients can forge headers and no personal identity is proven. Pairing codes are not equivalent to authenticated users.
- QR codes are generated locally, not by a third-party image service. The app does not call out to Google Fonts.
- Revoke tells the active client to stop locally and prevents subsequent signaling; a malicious modified client might keep an already established peer connection until the receiver also closes it. Current receiver UI closes its own peer.
- No security or privacy review has been completed. Missing protections include robust IP-based abuse rate limits, comprehensive disconnect/reconnection tests, authenticated identities, certified TLS onboarding, secure administration and audit-retention policies.

The local relay is an *experiment*, not a production release. Any verified supported-device matrix must be backed by actual tests.
