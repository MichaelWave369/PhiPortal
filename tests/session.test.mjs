import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSession, requestControl, approveNext, takeScreen, releaseScreen } from '../src/session.ts';

test('presenter handoff requires a queued request', () => {
  const start = makeSession();
  assert.equal(approveNext(start), start);
  const requested = requestControl(start, 'buddy-phone');
  assert.equal(requested.presenting, 'mikey');
  const approved = approveNext(requested);
  assert.equal(approved.presenting, 'buddy-phone');
  assert.deepEqual(approved.requests, []);
});

test('unknown or duplicate requests do not enter the queue', () => {
  const start = makeSession();
  assert.equal(requestControl(start, 'unknown'), start);
  assert.equal(requestControl(start, 'mikey'), start);
  const once = requestControl(start, 'buddy-laptop');
  assert.equal(requestControl(once, 'buddy-laptop'), once);
});

test('host override removes matching request and release is safe', () => {
  const queued = requestControl(makeSession(), 'buddy-phone');
  const switched = takeScreen(queued, 'buddy-phone');
  assert.equal(switched.presenting, 'buddy-phone');
  assert.equal(switched.requests.length, 0);
  const stopped = releaseScreen(switched);
  assert.equal(stopped.presenting, null);
  assert.equal(releaseScreen(stopped), stopped);
});
