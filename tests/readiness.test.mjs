import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChecks, makeSanitizedReceipt } from '../src/readiness.ts';

const base = {
  protocol: 'http:', hostname: '192.168.1.14', secureContext: false,
  captureAvailable: false, peerAvailable: true, socketAvailable: true,
  relayScheme: 'ws:', relayHostname: '192.168.1.14',
};
test('remote HTTP presenter is blocked even if WebRTC exists', () => {
  const results = computeChecks('presenter', base);
  assert.equal(results.find(c => c.id === 'capture-secure')?.level, 'blocked');
  assert.equal(results.find(c => c.id === 'capture-api')?.level, 'blocked');
});
test('receivers need not have capture API but localhost QR needs warning', () => {
  const results = computeChecks('receiver', { ...base, hostname: 'localhost', secureContext: true });
  assert.equal(results.some(c => c.id === 'capture-api'), false);
  assert.equal(results.find(c => c.id === 'qr-reachability')?.level, 'warning');
});
test('static Pages host is flagged because it cannot run relay', () => {
  const results = computeChecks('presenter', {
    ...base, protocol: 'https:', secureContext: true, captureAvailable: true,
    hostname: 'michaelwave369.github.io', relayScheme: 'wss:', relayHostname: 'michaelwave369.github.io',
  });
  assert.equal(results.find(c => c.id === 'relay-location')?.level, 'blocked');
});
test('receipt never embeds LAN IP, host, room code, SDP or display names', () => {
  const checks = computeChecks('presenter', base);
  const result = JSON.stringify(makeSanitizedReceipt('presenter', checks, 'reachable', '2026-10-14T00:00:00.000Z'));
  for (const privateValue of ['192.168', 'PHI369ROOM', 'candidate:', 'Mikey', 'relayHostname', 'explanation']) {
    assert.equal(result.includes(privateValue), false);
  }
  assert.equal(JSON.parse(result).status, 'UNVERIFIED_MEDIA');
});
