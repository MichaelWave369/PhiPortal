import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPage } from '../src/entry.ts';

test('valid QR joins open the real LAN rooms view', () => {
  assert.equal(initialPage('?join=PHI369ROOM'), 'rooms');
  assert.equal(initialPage('?join=phi369room&x=y'), 'rooms');
});
test('missing or untrusted join parameter does not force room entry', () => {
  assert.equal(initialPage(''), 'room');
  assert.equal(initialPage('?join=bad'), 'room');
  assert.equal(initialPage('?join=%3Cscript%3E'), 'room');
});
