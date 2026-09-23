import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitEmails, contactMatchesEmail } from '../src/lib/contact-email-match.ts';

test('splitEmails: eine einzelne Adresse', () => {
  assert.deepEqual(splitEmails('felix@hirschfeld.at'), ['felix@hirschfeld.at']);
});

test('splitEmails: Komma-Liste mit Leerzeichen, kleingeschrieben', () => {
  assert.deepEqual(
    splitEmails('Felix@Hirschfeld.at, felix@ehirsch.at ,  office@donau-it.at'),
    ['felix@hirschfeld.at', 'felix@ehirsch.at', 'office@donau-it.at']
  );
});

test('splitEmails: leer oder null ergibt leere Liste', () => {
  assert.deepEqual(splitEmails(null), []);
  assert.deepEqual(splitEmails(''), []);
  assert.deepEqual(splitEmails(undefined), []);
});

test('contactMatchesEmail: Treffer bei einzelner Adresse, ohne Rücksicht auf Groß-/Kleinschreibung', () => {
  assert.equal(contactMatchesEmail('Felix@Hirschfeld.at', 'felix@hirschfeld.at'), true);
});

test('contactMatchesEmail: Treffer bei der zweiten Adresse einer Komma-Liste', () => {
  assert.equal(contactMatchesEmail('felix@hirschfeld.at, felix@ehirsch.at', 'felix@ehirsch.at'), true);
});

test('contactMatchesEmail: kein Treffer', () => {
  assert.equal(contactMatchesEmail('felix@hirschfeld.at', 'unbekannt@example.com'), false);
});

test('contactMatchesEmail: leeres Kontaktfeld oder leere gesuchte Adresse ergibt nie einen Treffer', () => {
  assert.equal(contactMatchesEmail(null, 'felix@hirschfeld.at'), false);
  assert.equal(contactMatchesEmail('felix@hirschfeld.at', ''), false);
  assert.equal(contactMatchesEmail('felix@hirschfeld.at', '   '), false);
});
