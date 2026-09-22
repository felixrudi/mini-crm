import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAuth } from '../src/lib/server/auth-policy.ts';

const base = { dev: false, sessionValid: false, proxyUser: false };

test('ohne Anmeldung: Seiten gehen zum Login', () => {
  assert.equal(decideAuth({ ...base, pathname: '/contacts' }), 'login');
  assert.equal(decideAuth({ ...base, pathname: '/' }), 'login');
});

test('ohne Anmeldung: JSON-Routen werden abgewiesen, nicht umgeleitet', () => {
  assert.equal(decideAuth({ ...base, pathname: '/api/search' }), 'deny');
  assert.equal(decideAuth({ ...base, pathname: '/api/views' }), 'deny');
  assert.equal(decideAuth({ ...base, pathname: '/api/extract-card' }), 'deny');
});

test('mit gültiger Sitzung oder vertrautem Proxy-Benutzer: erlaubt', () => {
  assert.equal(decideAuth({ ...base, sessionValid: true, pathname: '/contacts' }), 'allow');
  assert.equal(decideAuth({ ...base, proxyUser: true, pathname: '/api/search' }), 'allow');
});

test('Login-Seite und statische Dateien sind immer offen', () => {
  assert.equal(decideAuth({ ...base, pathname: '/login' }), 'allow');
  assert.equal(decideAuth({ ...base, pathname: '/_app/immutable/x.js' }), 'allow');
  assert.equal(decideAuth({ ...base, pathname: '/design/fonts/inter.woff2' }), 'allow');
  assert.equal(decideAuth({ ...base, pathname: '/favicon.png' }), 'allow');
});

test('/api/v1 geht durch, dort prüft jede Route den Bearer-Schlüssel selbst', () => {
  assert.equal(decideAuth({ ...base, pathname: '/api/v1/contacts' }), 'allow');
});

test('ähnlich klingende Pfade sind KEINE Ausnahme', () => {
  assert.equal(decideAuth({ ...base, pathname: '/api/v1x/contacts' }), 'deny');
  assert.equal(decideAuth({ ...base, pathname: '/loginfoo' }), 'login');
});

test('lokal im Dev-Modus alles offen (Felix\' Arbeitsbereich)', () => {
  assert.equal(decideAuth({ ...base, dev: true, pathname: '/contacts' }), 'allow');
});
