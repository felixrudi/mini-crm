import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual } from '../src/lib/server/safe-equal.ts';

test('gleiche Texte sind gleich', () => {
  assert.equal(safeEqual('geheim-123', 'geheim-123'), true);
});

test('verschiedene Texte, auch verschiedener Länge, sind ungleich', () => {
  assert.equal(safeEqual('geheim-123', 'geheim-124'), false);
  assert.equal(safeEqual('kurz', 'viel-laenger-als-kurz'), false);
});

test('leer oder fehlend ist nie gleich, auch nicht leer gegen leer', () => {
  assert.equal(safeEqual('', ''), false);
  assert.equal(safeEqual(undefined, undefined), false);
  assert.equal(safeEqual(null, 'x'), false);
  assert.equal(safeEqual('x', undefined), false);
});
