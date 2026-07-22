import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesCompanyFilters, sortCompanies } from '../src/lib/server/company-filters.ts';
import { FIRMEN_FIELDS } from '../src/lib/server/teable-schema.ts';

const base = { tags: [] as string[], tagMode: 'or' as const, ort: '' };

test('matchesCompanyFilters: ort-Filter schließt andere Städte aus', () => {
  const fields = { [FIRMEN_FIELDS.ort]: 'Graz' };
  assert.equal(matchesCompanyFilters(fields, { ...base, ort: 'Wien' }), false);
  assert.equal(matchesCompanyFilters(fields, { ...base, ort: 'Graz' }), true);
});

test('matchesCompanyFilters: Textsuche findet Name und Notizen', () => {
  const fields = {
    [FIRMEN_FIELDS.name]: 'A1 Telekom Austria AG',
    [FIRMEN_FIELDS.notizen]: 'Mobilfunk Vertrag 380103837',
    [FIRMEN_FIELDS.website]: 'https://www.a1.net',
    [FIRMEN_FIELDS.telefon]: '0800 664 664'
  };
  assert.equal(matchesCompanyFilters(fields, { ...base, q: 'telekom' }), true);
  assert.equal(matchesCompanyFilters(fields, { ...base, q: '380103837' }), true);
  assert.equal(matchesCompanyFilters(fields, { ...base, q: 'a1.net' }), true);
  assert.equal(matchesCompanyFilters(fields, { ...base, q: 'xyz-nicht-da' }), false);
});

test('matchesCompanyFilters: Tag-UND-Modus verlangt jeden gewählten Tag', () => {
  const fields = { [FIRMEN_FIELDS.tags]: ['stb', 'wien'] };
  assert.equal(matchesCompanyFilters(fields, { ...base, tags: ['stb', 'wp'], tagMode: 'and' }), false);
  assert.equal(matchesCompanyFilters(fields, { ...base, tags: ['stb', 'wien'], tagMode: 'and' }), true);
});

test('sortCompanies: contacts-Sortierung ordnet nach absteigender Kontaktanzahl', () => {
  const companies = [
    { name: 'A', contact_count: 1 },
    { name: 'B', contact_count: 5 },
    { name: 'C', contact_count: 5 }
  ];
  const sorted = sortCompanies(companies, 'contacts');
  assert.deepEqual(sorted.map((c) => c.name), ['B', 'C', 'A']);
});

test('sortCompanies: tags-Sortierung ordnet nach absteigender Tag-Anzahl', () => {
  const companies = [
    { name: 'A', contact_count: 0, tags: ['x'] },
    { name: 'B', contact_count: 0, tags: ['x', 'y'] }
  ];
  const sorted = sortCompanies(companies, 'tags');
  assert.deepEqual(sorted.map((c) => c.name), ['B', 'A']);
});
