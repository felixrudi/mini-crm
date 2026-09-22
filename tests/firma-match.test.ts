import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFirmaName, findFirmaId } from '../src/lib/firma-match.ts';

const NAME = 'fldName';
const companies = [
  { id: 'rec1', fields: { [NAME]: 'Musterkanzlei GmbH' } },
  { id: 'rec2', fields: { [NAME]: 'Beta  Steuerberatung' } },
  { id: 'rec3', fields: {} }
];

test('normalizeFirmaName: trimmt, kleinschreibt, faltet Leerzeichen', () => {
  assert.equal(normalizeFirmaName('  Beta   Steuerberatung '), 'beta steuerberatung');
});

test('findFirmaId: findet ohne Rücksicht auf Groß-/Kleinschreibung', () => {
  assert.equal(findFirmaId(companies, NAME, 'MUSTERKANZLEI gmbh'), 'rec1');
});

test('findFirmaId: findet trotz doppelter Leerzeichen', () => {
  assert.equal(findFirmaId(companies, NAME, 'beta steuerberatung'), 'rec2');
});

test('findFirmaId: kein Treffer ergibt null', () => {
  assert.equal(findFirmaId(companies, NAME, 'Unbekannt AG'), null);
});

test('findFirmaId: leerer Name ergibt null, Firmen ohne Namen stören nicht', () => {
  assert.equal(findFirmaId(companies, NAME, '   '), null);
});
