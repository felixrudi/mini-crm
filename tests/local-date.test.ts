import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localIsoDate } from '../src/lib/local-date.ts';

test('localIsoDate: 23:30 Ortszeit bleibt derselbe Tag (kein UTC-Sprung)', () => {
  assert.equal(localIsoDate(new Date(2026, 8, 22, 23, 30)), '2026-09-22');
});

test('localIsoDate: 00:10 Ortszeit ist der neue Tag', () => {
  assert.equal(localIsoDate(new Date(2026, 8, 23, 0, 10)), '2026-09-23');
});

test('localIsoDate: einstellige Monate und Tage mit Null', () => {
  assert.equal(localIsoDate(new Date(2026, 0, 5, 12, 0)), '2026-01-05');
});
