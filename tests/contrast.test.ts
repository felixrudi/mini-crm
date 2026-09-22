import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio } from '../src/lib/contrast.ts';

const INK = '#2b221d';
const CREAM = '#f9f6f2';
const SAND = '#e6c5a8';
const RED = '#904446';
const WHITE = '#ffffff';

test('contrastRatio: schwarz auf weiß ist 21', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
});

test('Toast success: dunkler Text auf Sand', () => {
  assert.ok(contrastRatio(INK, SAND) >= 4.5);
});

test('Toast error: weißer Text auf Henry-Rot', () => {
  assert.ok(contrastRatio(WHITE, RED) >= 4.5);
});

test('Toast info: weißer Text auf Ink', () => {
  assert.ok(contrastRatio(WHITE, INK) >= 4.5);
});

test('alter Toast (weiß auf Sand) fiel durch — Beleg für den Fix', () => {
  assert.ok(contrastRatio(WHITE, SAND) < 3);
});

test('ink-soft #70625a hält 4,5:1 auf Grund und Karte', () => {
  assert.ok(contrastRatio('#70625a', CREAM) >= 4.5);
  assert.ok(contrastRatio('#70625a', WHITE) >= 4.5);
});
