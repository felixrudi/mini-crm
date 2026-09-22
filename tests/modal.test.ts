import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusIndex } from '../src/lib/actions/modal.ts';

test('Tab springt zum nächsten Element', () => {
  assert.equal(nextFocusIndex(4, 1, false), 2);
});

test('Tab am Ende springt an den Anfang', () => {
  assert.equal(nextFocusIndex(4, 3, false), 0);
});

test('Shift+Tab am Anfang springt ans Ende', () => {
  assert.equal(nextFocusIndex(4, 0, true), 3);
});

test('Fokus außerhalb: Tab geht zum ersten, Shift+Tab zum letzten', () => {
  assert.equal(nextFocusIndex(4, -1, false), 0);
  assert.equal(nextFocusIndex(4, -1, true), 3);
});

test('keine fokussierbaren Elemente ergibt -1', () => {
  assert.equal(nextFocusIndex(0, -1, false), -1);
});
