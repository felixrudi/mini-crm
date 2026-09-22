import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from '../src/lib/server/session.ts';

const SECRET = 'test-secret-mindestens-lang-genug';
const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

test('frisches Token ist gültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  assert.equal(verifySessionToken(SECRET, t, NOW + 1000), true);
});

test('abgelaufenes Token ist ungültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  assert.equal(verifySessionToken(SECRET, t, NOW + DAY + 1), false);
});

test('falsches Geheimnis ist ungültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  assert.equal(verifySessionToken('anderes-geheimnis', t, NOW + 1000), false);
});

test('Ablauf im Token verlängern (Fälschung) ist ungültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  const sig = t.split('.')[1];
  const forged = `${NOW + 365 * DAY}.${sig}`;
  assert.equal(verifySessionToken(SECRET, forged, NOW + DAY + 1), false);
});

test('der alte feste Cookie-Wert und Müll sind ungültig', () => {
  assert.equal(verifySessionToken(SECRET, 'authenticated', NOW), false);
  assert.equal(verifySessionToken(SECRET, '', NOW), false);
  assert.equal(verifySessionToken(SECRET, '.', NOW), false);
  assert.equal(verifySessionToken(SECRET, 'abc.def', NOW), false);
});
