import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomRegistry } from '../server/rooms.mjs';

function harness() {
  const messages = new Map();
  const send = (socket, value) => messages.set(socket, [...(messages.get(socket) || []), value]);
  const registry = createRoomRegistry({ send, now: () => 1_000, codeFactory: () => 'PHI369ROOM' });
  const host = {};
  const guest = {};
  const attacker = {};
  const last = (socket) => (messages.get(socket) || []).at(-1);
  registry.handle(host, { type: 'create' });
  return { registry, messages, last, host, guest, attacker };
}

test('guest must be approved by host before signaling', () => {
  const { registry, last, host, guest } = harness();
  registry.handle(guest, { type: 'join', code: 'PHI369ROOM', name: 'Mikey' });
  assert.equal(last(guest).type, 'joined-pending');
  const { guestId } = last(guest);
  assert.equal(last(host).type, 'join-request');
  registry.handle(guest, { type: 'signal', signal: { type: 'offer', sdp: 'abc' } });
  assert.equal(last(guest).type, 'error');
  registry.handle(host, { type: 'approve', guestId });
  assert.equal(last(guest).type, 'approved');
  registry.handle(guest, { type: 'signal', signal: { type: 'offer', sdp: 'abc' } });
  assert.deepEqual(last(host), { type: 'signal', guestId, signal: { type: 'offer', sdp: 'abc' } });
  registry.handle(host, { type: 'signal', guestId, signal: { type: 'answer', sdp: 'xyz' } });
  assert.deepEqual(last(guest), { type: 'signal', signal: { type: 'answer', sdp: 'xyz' } });
});

test('a guest cannot approve or impersonate a receiver', () => {
  const { registry, host, guest, attacker, last } = harness();
  registry.handle(guest, { type: 'join', code: 'PHI369ROOM', name: 'Guest' });
  registry.handle(attacker, { type: 'join', code: 'PHI369ROOM', name: 'Attacker' });
  const attackerId = last(attacker).guestId;
  registry.handle(attacker, { type: 'approve', guestId: attackerId });
  assert.equal(last(attacker).type, 'error');
  registry.handle(attacker, { type: 'signal', guestId: attackerId, signal: { type: 'answer', sdp: 'fake' } });
  assert.equal(last(attacker).type, 'error');
  registry.handle(host, { type: 'approve', guestId: attackerId });
  assert.equal(last(attacker).type, 'approved');
  registry.handle(guest, { type: 'signal', signal: { type: 'offer', sdp: 'not approved' } });
  assert.equal(last(guest).type, 'error');
});

test('host revocation stops authorization and host disconnect closes room', () => {
  const { registry, host, guest, last } = harness();
  registry.handle(guest, { type: 'join', code: 'PHI369ROOM', name: 'Guest' });
  const guestId = last(guest).guestId;
  registry.handle(host, { type: 'approve', guestId });
  registry.handle(host, { type: 'revoke' });
  assert.equal(last(guest).type, 'revoked');
  registry.handle(guest, { type: 'signal', signal: { type: 'offer', sdp: 'abc' } });
  assert.equal(last(guest).type, 'error');
  registry.disconnect(host);
  assert.equal(last(guest).type, 'room-closed');
  assert.equal(registry.roomCount(), 0);
});

test('join attempts and invalid rooms are bounded', () => {
  const { registry, attacker, last } = harness();
  for (let i = 0; i < 8; i++) registry.handle(attacker, { type: 'join', code: 'UNKNOWN', name: 'Visitor' });
  assert.match(last(attacker).message, /Too many/);
});
