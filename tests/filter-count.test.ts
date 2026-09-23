import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeFilterCount } from '../src/lib/filter-count.ts';

// Echter App-Normalzustand: kein URL-Param -> tagsExclude = ['archiv'] (archivierte ausgeblendet).
const NORMAL = { tags: [], tagsExclude: ['archiv'], ort: '', group: '' };

test('Normalzustand (archiv-Standardausschluss) zählt als 0 aktive Filter', () => {
  assert.equal(activeFilterCount(NORMAL), 0);
});

test('"Alle"-Ansicht (tagsExclude explizit leer) zählt als 1 aktiver Filter', () => {
  assert.equal(activeFilterCount({ ...NORMAL, tagsExclude: [] }), 1);
});

test('ausgewählte und zusätzlich ausgeschlossene Tags zählen einzeln, archiv bleibt Standard', () => {
  assert.equal(activeFilterCount({ ...NORMAL, tags: ['a', 'b'], tagsExclude: ['archiv', 'c'] }), 3);
});

test('Ort und Gruppierung zählen je 1, unabhängig vom Wert', () => {
  assert.equal(activeFilterCount({ ...NORMAL, ort: 'Wien' }), 1);
  assert.equal(activeFilterCount({ ...NORMAL, group: 'tags' }), 1);
  assert.equal(activeFilterCount({ ...NORMAL, ort: 'Wien', group: 'tags' }), 2);
});

test('alles zusammen summiert sich', () => {
  assert.equal(
    activeFilterCount({ tags: ['a'], tagsExclude: ['archiv', 'b', 'c'], ort: 'Wien', group: 'tags' }),
    5
  );
});

test('archiv selbst nicht mehr ausgeschlossen ("Alle" + ein zusätzlicher Ausschluss) zählt beides', () => {
  assert.equal(activeFilterCount({ ...NORMAL, tagsExclude: ['lead'] }), 2);
});
