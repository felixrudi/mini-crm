import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeFilterCount } from '../src/lib/filter-count.ts';

const LEER = { tags: [], tagsExclude: [], ort: '', group: '' };

test('ohne Filter ist die Anzahl 0', () => {
  assert.equal(activeFilterCount(LEER), 0);
});

test('ausgewählte und ausgeschlossene Tags zählen einzeln', () => {
  assert.equal(activeFilterCount({ ...LEER, tags: ['a', 'b'], tagsExclude: ['c'] }), 3);
});

test('Ort und Gruppierung zählen je 1, unabhängig vom Wert', () => {
  assert.equal(activeFilterCount({ ...LEER, ort: 'Wien' }), 1);
  assert.equal(activeFilterCount({ ...LEER, group: 'tags' }), 1);
  assert.equal(activeFilterCount({ ...LEER, ort: 'Wien', group: 'tags' }), 2);
});

test('alles zusammen summiert sich', () => {
  assert.equal(activeFilterCount({ tags: ['a'], tagsExclude: ['b', 'c'], ort: 'Wien', group: 'tags' }), 5);
});
