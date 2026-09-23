import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addArchivTag } from '../src/lib/server/archive.ts';

test('fügt archiv-Tag hinzu, wenn er fehlt', () => {
  assert.deepEqual(addArchivTag(['kunde', 'wien']), ['kunde', 'wien', 'archiv']);
});

test('erneutes Archivieren fügt archiv nicht zweimal hinzu', () => {
  assert.deepEqual(addArchivTag(['kunde', 'archiv']), ['kunde', 'archiv']);
});

test('Kontakt ohne Tags bekommt genau [archiv]', () => {
  assert.deepEqual(addArchivTag(undefined), ['archiv']);
  assert.deepEqual(addArchivTag(null), ['archiv']);
  assert.deepEqual(addArchivTag([]), ['archiv']);
});

test('nicht-string-Einträge aus Teable werden verworfen, kein Crash', () => {
  assert.deepEqual(addArchivTag(['kunde', 42, null, undefined]), ['kunde', 'archiv']);
});
