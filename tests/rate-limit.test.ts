import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../src/lib/server/rate-limit.ts';

test('bis zum Limit erlaubt, danach gesperrt', () => {
  const l = createLimiter(3, 1000);
  assert.equal(l.allow('ip', 0), true);
  assert.equal(l.allow('ip', 1), true);
  assert.equal(l.allow('ip', 2), true);
  assert.equal(l.allow('ip', 3), false);
});

test('nach Ablauf des Fensters wieder erlaubt', () => {
  const l = createLimiter(1, 1000);
  assert.equal(l.allow('ip', 0), true);
  assert.equal(l.allow('ip', 500), false);
  assert.equal(l.allow('ip', 1001), true);
});

test('jeder Schlüssel zählt für sich', () => {
  const l = createLimiter(1, 1000);
  assert.equal(l.allow('a', 0), true);
  assert.equal(l.allow('b', 0), true);
});
