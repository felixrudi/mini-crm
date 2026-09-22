import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, mixOver } from '../src/lib/contrast.ts';

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

test('ink/40 und ink/60 auf Grund fallen durch, ink/70 besteht', () => {
  assert.ok(contrastRatio(mixOver(INK, CREAM, 0.4), CREAM) < 3);
  assert.ok(contrastRatio(mixOver(INK, CREAM, 0.6), CREAM) < 4.5);
  assert.ok(contrastRatio(mixOver(INK, CREAM, 0.7), CREAM) >= 4.5);
});

test('light-neumorphic: alter foreground-dim #667088 fiel auf dem Theme-Grund durch — Beleg für den Fix', () => {
  assert.ok(contrastRatio('#667088', '#eef0f3') < 4.5);
});

test('light-neumorphic: foreground-dim #616b83 hält 4,5:1 auf Theme-Grund und Karte', () => {
  assert.ok(contrastRatio('#616b83', '#eef0f3') >= 4.5);
  assert.ok(contrastRatio('#616b83', '#ffffff') >= 4.5);
});
