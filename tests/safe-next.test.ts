import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../src/lib/server/safe-next.ts';

test('eigene Pfade bleiben, samt Query', () => {
  assert.equal(safeNext('/contacts?tags=a'), '/contacts?tags=a');
  assert.equal(safeNext('/'), '/');
});

test('fremde und getarnte Ziele werden zu /', () => {
  assert.equal(safeNext('//evil.com'), '/');
  assert.equal(safeNext('https://evil.com'), '/');
  assert.equal(safeNext('/\\evil.com'), '/');
  assert.equal(safeNext('javascript:alert(1)'), '/');
  assert.equal(safeNext('/ok\r\nSet-Cookie: x=1'), '/');
});

test('leer oder fehlend wird zu /', () => {
  assert.equal(safeNext(''), '/');
  assert.equal(safeNext(null), '/');
  assert.equal(safeNext(undefined), '/');
});
