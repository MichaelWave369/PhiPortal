# Manual two-device validation checklist

This is a test guide, not proof that these tests have passed.

1. Start the relay: npm install, npm run build, npm run relay.
2. On the receiver browser, visit http://<relay-LAN-IP>:8787/PhiPortal/, open **LAN rooms**, create a room and note the code.
3. On the relay host PC, visit http://localhost:8787/PhiPortal/ (a secure context on the local host), open **LAN rooms** and join by entering the room code. If a guest is on a different machine, it needs a trusted HTTPS/WSS setup for screen capture.
4. On the receiver, approve the guest. Verify that before approval the guest cannot capture through the app.
5. On the presenter, click Start screen sharing, choose a window in the browser picker, and observe the receiver. Test stop, revoke, and disconnect.
6. Repeat with two guest requests. Verify that approving a new guest revokes the prior one.
7. Try an incorrect room code, wrong network, revoked guest replay, room closure, and blocked clipboard permissions.
8. Record browser/OS versions, connection success or failure, and any ICE or autoplay errors as evidence.

**Do not use this prototype on an untrusted network or for sensitive content.**
