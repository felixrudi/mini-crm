import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecordId, checkUpload, IMAGE_TYPES } from '../src/lib/server/validation.ts';

test('isRecordId: echte Form ja, Müll nein', () => {
  assert.equal(isRecordId('recAbCdEfGhIjKlMn'), true);
  assert.equal(isRecordId(''), false);
  assert.equal(isRecordId(null), false);
  assert.equal(isRecordId('recA'), false);
  assert.equal(isRecordId('tbl58ahoWar7wVxWHjA'), false);
  assert.equal(isRecordId('recAbCdEfGhIjKlMn/../x'), false);
});

const MB = 1024 * 1024;

test('checkUpload: passendes Bild ist in Ordnung', () => {
  assert.equal(checkUpload({ size: 2 * MB, type: 'image/jpeg' }, { maxBytes: 8 * MB, types: IMAGE_TYPES }), null);
});

test('checkUpload: zu groß', () => {
  assert.match(checkUpload({ size: 9 * MB, type: 'image/png' }, { maxBytes: 8 * MB }) ?? '', /zu groß/i);
});

test('checkUpload: falscher Typ', () => {
  assert.match(
    checkUpload({ size: 1000, type: 'application/x-msdownload' }, { maxBytes: 8 * MB, types: IMAGE_TYPES }) ?? '',
    /Dateityp/i
  );
});

test('checkUpload: ohne Typ-Liste ist jeder Typ erlaubt', () => {
  assert.equal(checkUpload({ size: 1000, type: 'application/pdf' }, { maxBytes: 8 * MB }), null);
});
