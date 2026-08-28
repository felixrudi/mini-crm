import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesContactFilters, sortContacts } from '../src/lib/server/contact-filters.ts';
import { KONTAKTE_FIELDS } from '../src/lib/server/teable-schema.ts';

const base = { q: '', tags: [] as string[], tagMode: 'or' as const, kanal: '', ort: '' };

test('matchesContactFilters: ort-Filter schließt andere Städte aus', () => {
  const fields = { [KONTAKTE_FIELDS.ort]: 'Graz' };
  assert.equal(matchesContactFilters(fields, { ...base, ort: 'Wien' }), false);
  assert.equal(matchesContactFilters(fields, { ...base, ort: 'Graz' }), true);
  assert.equal(matchesContactFilters(fields, { ...base, ort: '' }), true);
});

test('matchesContactFilters: Tag-UND-Modus verlangt jeden gewählten Tag', () => {
  const fields = { [KONTAKTE_FIELDS.tags]: ['felix', 'steuerberater'] };
  assert.equal(matchesContactFilters(fields, { ...base, tags: ['felix', 'wp'], tagMode: 'and' }), false);
  assert.equal(matchesContactFilters(fields, { ...base, tags: ['felix', 'steuerberater'], tagMode: 'and' }), true);
});

test('matchesContactFilters: Tag-ODER-Modus verlangt irgendeinen gewählten Tag', () => {
  const fields = { [KONTAKTE_FIELDS.tags]: ['felix'] };
  assert.equal(matchesContactFilters(fields, { ...base, tags: ['felix', 'wp'], tagMode: 'or' }), true);
});

test('sortContacts: Firma-Sortierung fällt bei gleicher Firma auf Name zurück', () => {
  const contacts = [
    { name: 'Zoe', company_name: 'Acme' },
    { name: 'Anna', company_name: 'Acme' },
    { name: 'Bert', company_name: null }
  ];
  const sorted = sortContacts(contacts, 'company');
  assert.deepEqual(sorted.map((c) => c.name), ['Bert', 'Anna', 'Zoe']);
});

test('sortContacts: Tags-Sortierung ordnet nach absteigender Tag-Anzahl', () => {
  const contacts = [
    { name: 'A', company_name: null, tags: ['x'] },
    { name: 'B', company_name: null, tags: ['x', 'y', 'z'] },
    { name: 'C', company_name: null, tags: [] }
  ];
  const sorted = sortContacts(contacts, 'tags');
  assert.deepEqual(sorted.map((c) => c.name), ['B', 'A', 'C']);
});

test('sortContacts: Aktivitäts-Sortierung zeigt zuletzt Gehörtes zuerst', () => {
  const contacts = [
    { name: 'Alt', company_name: null, last_activity: '2026-07-29' },
    { name: 'Neu', company_name: null, last_activity: '2026-08-21' },
    { name: 'Nie', company_name: null, last_activity: null }
  ];
  const sorted = sortContacts(contacts, 'activity');
  assert.deepEqual(sorted.map((c) => c.name), ['Neu', 'Alt', 'Nie']);
});

test('sortContacts: gleiche Aktivität fällt auf Name zurück', () => {
  const contacts = [
    { name: 'Zoe', company_name: null, last_activity: '2026-08-21' },
    { name: 'Anna', company_name: null, last_activity: '2026-08-21' },
    { name: 'Bert', company_name: null, last_activity: null },
    { name: 'Aaron', company_name: null, last_activity: null }
  ];
  const sorted = sortContacts(contacts, 'activity');
  assert.deepEqual(sorted.map((c) => c.name), ['Anna', 'Zoe', 'Aaron', 'Bert']);
});
