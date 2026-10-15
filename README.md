# PhiPortal

**One screen. Everybody connects.**

A local-first experiment in sharing a TV or monitor among devices. The target is a small receiver appliance with explicit host control, not a KVM or a DRM workaround.

## What exists

| Piece | Current state |
| --- | --- |
| React control room | Interactive *simulation* (PR #1) |
| Manual WebRTC lab | Experimental real browser media exchange (PR #1) |
| Local room relay + short code + QR join | PR #2 experimental implementation; requires local Node process |
| Receiver approval and revoke | PR #2 relay-enforced signaling permissions |
| Automatic WebRTC offer/answer exchange | PR #2 LAN relay path; two-device validation pending |
| Cross-device discovery / HDMI hardware / native casting | Not implemented |

## Install and run

Requires Node.js 22+.

```bash
npm install
npm test
npm run build
npm run relay
```

The last command starts an **in-memory, local signaling server** and static site at port 8787, listening on the local network by default. Restrict it with `PHIPORTAL_BIND=127.0.0.1` when you only need loopback. The local relay is for a trusted development LAN, not public hosting.

In the **receiver** browser, visit `http://<relay-machine-LAN-IP>:8787/PhiPortal/`, open **LAN rooms**, and select **Create room**. Display the QR code. On a presenting device, visit the join link, request access and wait for the receiver to approve. The presenter then clicks **Start screen sharing** and grants the browser's own picker permission.

**Important browser constraint:** `getDisplayMedia` only works in a *secure context* (HTTPS or localhost). A second laptop visiting `http://192.168.x.x:8787` cannot normally share its screen. A practical first test is: receiver on an HTTP LAN address and presenter on **the relay host machine at** `http://localhost:8787/PhiPortal/`; join by typing the room code. To support a different presenting laptop, set up trusted TLS (below) or run a development UI on that laptop's localhost with a reachable relay configured. Some browser private-network rules can further restrict cross-origin use.

The automatically generated QR link only works if the receiver itself opened the relay via an address other devices can reach. A QR to `localhost` will not reach other machines.

### TLS and development configuration

Supply **both** `PHIPORTAL_TLS_CERT` and `PHIPORTAL_TLS_KEY` as absolute paths to a certificate and key trusted by each participating browser. This enables HTTPS for the local relay and WSS for signaling. The relay **does not generate or install certificates**, and a self-signed certificate requires appropriate trust setup on every client. Keep HTTPS and WSS same-origin for normal use.

The Vite UI can optionally use `VITE_SIGNAL_URL` to override the signaling endpoint (for example while developing a sender UI on its own localhost). Cross-origin relays must also explicitly allow the origin via the comma-separated `PHIPORTAL_ALLOWED_ORIGINS` setting. Defaults reject mismatched origins.

```bash
# Example only after configuring trusted certificate paths
PHIPORTAL_TLS_CERT=/absolute/path/cert.pem PHIPORTAL_TLS_KEY=/absolute/path/key.pem npm run relay
```

GitHub Pages is **only the static UI**: it cannot host this Node relay. Pages over HTTPS also cannot connect to an insecure `ws://` LAN relay due to browser mixed-content restrictions. A fully browser-based, no-install cross-device sender experience requires additional infrastructure and security work.

## Scope and cautions

Rooms live only in RAM and disappear when the receiver disconnects or the relay restarts. Join codes are 10-character random values and expire for **new joins after 15 minutes**. Receivers explicitly approve guests; the relay won't forward a guest's offer until approval. Approval is **not** permission to capture the guest's screen: the browser still asks.

Do **not** use v0.2 on an untrusted network, or share sensitive content. Plain HTTP/WS leaks signaling and room codes on the network, and the current system has no account identity, long-term authentication, IP hardening or production security review. The media path is direct WebRTC and may fail due to Wi-Fi isolation, mDNS/ICE limitations or missing STUN/TURN infrastructure. No native phone screen mirroring or console capture is implemented.

Run `npm run dev` for the Vite static interface. `npm run relay` serves the built site and WebSocket signaling. Read [architecture](docs/ARCHITECTURE.md), [privacy and safety](docs/SAFETY.md), [roadmap](docs/ROADMAP.md), and the [manual LAN validation guide](tests/room-protocol-guide.md).

License: MIT, © 2026 MichaelWave369 and contributors.

## First Light testing

Open **Device check** to inspect WebRTC/screen-capture browser prerequisites and voluntarily probe relay reachability; all media remains unverified until an actual stream is observed. A privacy-safe receipt excludes host details, room codes, identities and SDP. Valid QR `?join=CODE` links open **LAN rooms** automatically.

Follow [the two-computer Windows walkthrough](docs/FIRST_LIGHT.md) for a real LAN smoke test. GitHub Actions cannot stand in for a physical screen-sharing test.
