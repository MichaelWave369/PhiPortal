import { randomBytes } from 'node:crypto';

const LIFETIME_MS = 15 * 60 * 1000;
const MAX_GUESTS = 16;
const MAX_ATTEMPTS = 6;
const MAX_SDP = 130_000;

function makeCode() {
  return randomBytes(8).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
}

/**
 * In-memory, ephemeral room control plane. The WebSocket itself identifies
 * hosts and guests. Client-provided IDs are never considered authority.
 */
export function createRoomRegistry({ now = () => Date.now(), codeFactory = makeCode, send = (ws, payload) => ws.send(JSON.stringify(payload)) } = {}) {
  const rooms = new Map();
  const members = new Map();
  const attempts = new Map();

  function emit(socket, event) {
    if (socket) send(socket, event);
  }
  function fail(socket, message) {
    emit(socket, { type: 'error', message });
  }
  function findRoomFor(socket) {
    const ref = members.get(socket);
    if (!ref) return null;
    const room = rooms.get(ref.code);
    return room ? { room, ref } : null;
  }
  function detach(socket) {
    const entry = findRoomFor(socket);
    members.delete(socket);
    attempts.delete(socket);
    if (!entry) return;
    const { room, ref } = entry;
    if (ref.role === 'host') {
      for (const guest of room.guests.values()) {
        emit(guest.socket, { type: 'room-closed' });
        members.delete(guest.socket);
      }
      rooms.delete(ref.code);
      return;
    }
    room.guests.delete(ref.guestId);
    if (room.activeId === ref.guestId) room.activeId = null;
    emit(room.host, { type: 'guest-left', guestId: ref.guestId, activeId: room.activeId });
  }
  function handle(socket, event) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) return fail(socket, 'Invalid message.');
    const type = event.type;
    if (type === 'create') {
      if (members.has(socket)) return fail(socket, 'Already in a room.');
      let code;
      do { code = codeFactory(); } while (rooms.has(code));
      if (!/^[A-Z0-9]{8,16}$/.test(code)) return fail(socket, 'Room code generator failed validation.');
      const room = { code, host: socket, guests: new Map(), activeId: null, expiresAt: now() + LIFETIME_MS };
      rooms.set(code, room);
      members.set(socket, { role: 'host', code });
      emit(socket, { type: 'room-created', code, expiresAt: room.expiresAt });
      return;
    }
    if (type === 'join') {
      if (members.has(socket)) return fail(socket, 'Already in a room.');
      const n = (attempts.get(socket) ?? 0) + 1;
      attempts.set(socket, n);
      if (n > MAX_ATTEMPTS) return fail(socket, 'Too many joining attempts on this connection.');
      const code = typeof event.code === 'string' ? event.code.trim().toUpperCase() : '';
      const room = rooms.get(code);
      if (!room || now() >= room.expiresAt) return fail(socket, 'Room not found or joining window expired.');
      if (room.guests.size >= MAX_GUESTS) return fail(socket, 'Room is full.');
      const name = typeof event.name === 'string' ? event.name.trim().replace(/[\x00-\x1F\x7F]/g, '').slice(0, 40) : '';
      if (!name) return fail(socket, 'Enter a display name.');
      const guestId = randomBytes(12).toString('hex');
      room.guests.set(guestId, { socket, name, approved: false });
      members.set(socket, { role: 'guest', code, guestId });
      emit(socket, { type: 'joined-pending', code, guestId });
      emit(room.host, { type: 'join-request', guestId, name });
      return;
    }
    const entry = findRoomFor(socket);
    if (!entry) return fail(socket, 'Join or create a room first.');
    const { room, ref } = entry;
    if (type === 'request') {
      if (ref.role !== 'guest') return fail(socket, 'Only a guest can request presenter access.');
      const guest = room.guests.get(ref.guestId);
      if (!guest || guest.approved) return fail(socket, 'Already approved or no guest record.');
      emit(room.host, { type: 'join-request', guestId: ref.guestId, name: guest.name });
      emit(socket, { type: 'joined-pending', code: room.code, guestId: ref.guestId });
      return;
    }
    if (type === 'approve' || type === 'reject') {
      if (ref.role !== 'host') return fail(socket, 'Only the receiver can approve guests.');
      const guest = room.guests.get(event.guestId);
      if (!guest || guest.approved) return fail(socket, 'No pending request for that guest.');
      if (type === 'reject') {
        emit(guest.socket, { type: 'rejected' });
        members.delete(guest.socket);
        room.guests.delete(event.guestId);
        return;
      }
      if (room.activeId && room.activeId !== event.guestId) {
        const old = room.guests.get(room.activeId);
        if (old) {
          old.approved = false;
          emit(old.socket, { type: 'revoked' });
        }
      }
      room.activeId = event.guestId;
      guest.approved = true;
      emit(guest.socket, { type: 'approved' });
      emit(socket, { type: 'active', guestId: event.guestId, name: guest.name });
      return;
    }
    if (type === 'revoke') {
      if (ref.role !== 'host') return fail(socket, 'Only the receiver can revoke a presenter.');
      if (room.activeId) {
        const guest = room.guests.get(room.activeId);
        if (guest) {
          guest.approved = false;
          emit(guest.socket, { type: 'revoked' });
        }
      }
      room.activeId = null;
      emit(socket, { type: 'active', guestId: null, name: null });
      return;
    }
    if (type === 'stop-share') {
      if (ref.role !== 'guest' || room.activeId !== ref.guestId) return fail(socket, 'You are not the active presenter.');
      emit(room.host, { type: 'share-stopped', guestId: ref.guestId });
      return;
    }
    if (type === 'signal') {
      const signal = event.signal;
      if (!signal || typeof signal !== 'object' || typeof signal.sdp !== 'string' || signal.sdp.length < 1 || signal.sdp.length > MAX_SDP) {
        return fail(socket, 'Invalid SDP.');
      }
      if (ref.role === 'guest') {
        if (room.activeId !== ref.guestId || signal.type !== 'offer') return fail(socket, 'No active presenter authorization for an offer.');
        emit(room.host, { type: 'signal', guestId: ref.guestId, signal: { type: 'offer', sdp: signal.sdp } });
      } else {
        if (signal.type !== 'answer' || !room.activeId || event.guestId !== room.activeId) return fail(socket, 'No active guest for that answer.');
        const active = room.guests.get(room.activeId);
        if (active?.approved) emit(active.socket, { type: 'signal', signal: { type: 'answer', sdp: signal.sdp } });
      }
      return;
    }
    fail(socket, 'Unknown room command.');
  }
  return { handle, disconnect: detach, roomCount: () => rooms.size };
}
