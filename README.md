# PhiPortal

**One screen. Everybody connects.**

Experimental, open-source, local-first collaborative display software. PhiPortal aims to turn a spare monitor, television, or small HDMI-connected computer into a shared display, with explicit participant consent and host-controlled handoffs.

## Current truth (v0.1 prototype)

| Feature | Status |
| --- | --- |
| Responsive React control room | Implemented, interactive **simulation** |
| Queue, host approval, simulated display layout, event feed | Implemented **locally in one browser only** |
| Browser capture and peer-to-peer WebRTC screen streaming | Experimental, **manual SDP handshake** |
| Real cross-device discovery, join codes, authorization | Not implemented |
| Native AirPlay, Miracast, Google Cast and console compatibility | Not implemented |
| PhiPie / HDMI hardware and CEC commands | Not implemented |
| Production privacy/security assessment | Not completed |

No live-streaming or device compatibility claim should be inferred from a passing UI build.

## Run locally

Requires Node.js 22+ and npm.

1. Clone this repository and change into its directory.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local address Vite prints (normally `http://localhost:5173/PhiPortal/`).

Checks: `npm test`, `npm run typecheck`, `npm run build`.

The production build uses the `/PhiPortal/` base path for GitHub Pages. GitHub Pages must be configured to deploy from **GitHub Actions** in repository settings.

## Real streaming experiment (no signaling service)

1. Open the app on two browsers, generally on the same reachable local network. HTTPS (or localhost on the capturing machine) is necessary for screen capture.
2. On the sender, choose **WebRTC lab → I am presenting → Start sharing**. Choose what to share in the browser permission prompt.
3. Privately transfer the generated **offer JSON** to the receiving browser.
4. On the receiver, choose **I am receiving**, paste the offer, and select **Generate answer**.
5. Privately transfer the resulting **answer JSON** back to the sender and select **Apply answer**.
6. Stop and disconnect on either side when finished.

The video travels peer-to-peer with WebRTC encryption when a connection is established. Signaling still requires manual transfer outside the app. The experiment uses **host ICE candidates only** with no STUN or TURN server, so peer connections can fail due to browser candidate policy, mDNS support, firewalls, guest Wi-Fi isolation, or different networks. Manual exchange is deliberate; QR pairing and consented session signaling come later. Do not share SDP publicly: it can contain network/session details.

Browser screen capture is not supported on every phone/browser and cannot bypass protected content. Consoles require their own legal and technically compatible input/capture route. There is no cross-device input control, browser permission bypass, automatic recording, cloud upload, user database, or protocol-level auth.

## Intent

The end-state is a tiny networked appliance connected to HDMI that can accept explicitly approved shares from multiple kinds of devices and run a programmable local display UI. The software is independently implemented; third-party interoperability requires protocol-specific research and testing.

Read [architecture](docs/ARCHITECTURE.md), [safety boundaries](docs/SAFETY.md), and [roadmap](docs/ROADMAP.md).

MIT license. © 2026 MichaelWave369 and contributors.
