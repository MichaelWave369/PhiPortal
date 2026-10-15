# First Light: a truthful two-computer test

**Goal:** demonstrate one real, user-approved desktop stream between two browsers on the same trusted LAN, recording success or failure without pretending the QR flow alone proves it works.

## Prepare

On the Windows PC that will host the service, in a current PhiPortal checkout:

```powershell
git pull --ff-only
npm install
npm test
npm run build
npm run relay
```

The relay listens on port 8787 by default and serves the built UI at `/PhiPortal/`. Only run this on a trusted LAN. Windows Firewall might need a temporary, Private-network-only inbound permission for Node; do not expose port 8787 to the public internet. Keep the PowerShell window open while testing.

Find the first PC's private IPv4 address with `ipconfig`. This example uses `192.168.1.20`; **substitute your actual address**.

## Two-PC LAN exercise without certificate provisioning

1. On **PC B (receiver)**, open `http://192.168.1.20:8787/PhiPortal/` using the actual IP of PC A.
2. Navigate to **LAN rooms** → **This is the TV / receiver** → **Create room**. Keep the receiver tab visible and note its code.
3. On **PC A (presenter and relay host)**, open `http://localhost:8787/PhiPortal/?join=YOURROOMCODE`. The valid QR join code should automatically select **LAN rooms** and **presenter**. **Do not use the LAN IP URL as the sender**; browser display capture on plain HTTP LAN addresses is ordinarily blocked.
4. Enter a display name and click **Request to join** on PC A. On PC B, approve it.
5. On PC A, choose **Start screen sharing** and select a window/screen when the browser asks. On PC B, watch for incoming video.
6. Test stopping the share, revoking access, disconnecting, and making a fresh request after revocation.

**If you want to scan the QR from a third phone**, it can show the join UI, but mobile browsers may not expose whole-screen capture. A clickable QR does *not* prove that a phone can cast a screen.

### Capture/transport constraints

`getDisplayMedia` requires browser permission and a secure context (HTTPS or localhost). The localhost exception applies to the device browsing locally, **not** a different device visiting an HTTP private IP. This smoke test deliberately keeps the sender on the relay host's localhost while the receiver only plays video on the LAN HTTP address. It is **not** suitable for sensitive information because the room signaling is unencrypted.

For actual **PC-to-PC sending from a separate machine**, use a trusted HTTPS/WSS endpoint and certificate, or develop with both senders on trusted localhost origins and an appropriately restricted signaling relay. Production authentication, secure onboarding, TURN and interoperable casting are separate milestones.

### If it fails

Go to **Device check** on both browsers. Record capability statuses, relay probe result, browser name/version, approximate network topology, whether the browser capture picker opened, whether the sender reported a direct peer connection, and whether the receiver displayed a moving picture. Use the privacy-safe receipt button; it intentionally omits SDP, credentials, room codes, IP addresses and identity.

Inspect browser developer console for ICE, CSP, autoplay and insecure-context errors. Check that each PC can reach port 8787 and that your Wi-Fi is not using client isolation. Neither the app nor this checklist can guarantee a successful LAN peer connection.

## Evidence gate

Call it **two-device verified** only after somebody actually performs the above real-world test and records a dated observation with device/browser versions and outcome. Passing CI, checking the WebSocket relay, displaying a QR code or seeing an SDP answer **does not satisfy this gate**.
