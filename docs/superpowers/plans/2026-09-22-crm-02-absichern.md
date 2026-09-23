# CRM Runde 2 — Absichern: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das CRM prüft Anmeldung und Eingaben selbst, statt sich allein auf den vorgeschalteten Login-Türsteher zu verlassen.

**Architecture:** Eine zentrale `hooks.server.ts` entscheidet für jede Anfrage über eine reine Funktion (`decideAuth`), ob sie durchgeht, zum Login geschickt oder abgewiesen wird. Session-Cookie, Passwortvergleich, Redirect-Ziel, Login-Bremse, Upload-Prüfung und Markdown-Bereinigung sind kleine, einzeln getestete Module ohne SvelteKit-Abhängigkeit.

**Tech Stack:** SvelteKit 2, Node 22 (`node:crypto`), `marked` 18, `node --test`.

**Spec:** `2026-09-22-crm-00-uebersicht.md` und Audit `3-code.md` (Befunde 1–5, 7, 8).

**Voraussetzung:** Runde 1 ist abgeschlossen (`npm test` läuft, Felix' Änderung an `+layout.server.ts` ist gesichert).

## Global Constraints

- Arbeitsverzeichnis: `/Users/felix/Documents/Programmieren/mini-crm`.
- Getestete Module: nur `node:*`-Importe, Import in Tests mit Endung `.ts`.
- **Fail-closed:** Fehlt `SESSION_SECRET`, `CRM_PASSWORD` oder `CRM_API_KEY`, wird verweigert, nie durchgelassen.
- Kein `git push`, kein `./deploy.sh`, keine Änderung an Coolify oder am Server ohne Felix' ausdrückliches Ja pro Schritt (Entscheidungen 2a, 2b, 2c).
- Secrets werden nie ausgegeben, auch nicht in Logs oder Testausgaben.
- Der Bearer-Zugang für Henry unter `/api/v1/*` muss nach jeder Änderung weiter funktionieren.
- Commit-Nachrichten enden mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `src/lib/server/safe-equal.ts` | neu | Vergleich ohne Zeit-Seitenkanal, leer = falsch |
| `src/lib/server/session.ts` | neu | signiertes Session-Token mit Ablauf |
| `src/lib/server/safe-next.ts` | neu | Redirect-Ziel nur auf eigene Pfade |
| `src/lib/server/rate-limit.ts` | neu | Login-Bremse |
| `src/lib/server/auth-policy.ts` | neu | Entscheidung erlaubt / Login / abgewiesen |
| `src/lib/server/validation.ts` | neu | Record-ID-Muster, Upload-Grenzen |
| `src/lib/markdown.ts` | neu | Markdown ohne rohes HTML, nur sichere Links |
| `tests/*.test.ts` | neu | je ein Test pro Modul |
| `src/hooks.server.ts` | neu | zentraler Türsteher + Sicherheits-Header |
| `src/lib/api-auth.ts` | ändern | `safeEqual`, fail-closed |
| `src/routes/login/+page.server.ts` | ändern | echtes Token, Bremse, `next` prüfen |
| `src/routes/logout/+server.ts` | neu | Abmelden |
| `src/routes/+layout.server.ts` | ändern | Auth-Logik entfällt (macht der Hook) |
| `src/lib/components/TimelineItem.svelte` | ändern | `renderMarkdown` statt `marked` |
| `src/routes/api/extract-card/+server.ts`, `api/contacts/[id]/photo/+server.ts`, `api/contacts/[id]/files/+server.ts` | ändern | Upload-Grenzen |
| `src/routes/contacts/+page.server.ts` | ändern | ID-Prüfung bei update/delete |
| `src/lib/server/teable.ts` | ändern | Schlüssel erst zur Laufzeit lesen |
| `Dockerfile`, `deploy.sh`, `.env.example` | ändern | Schlüssel raus aus dem Image |

---

### Task 0: Vor dem Bauen — read-only am Server klären

**Files:** keine Änderungen. Ergebnis wird als Kommentar im Übergabetext festgehalten.

Dieser Task liefert die Antworten auf zwei Fragen, an denen Entscheidung 2a und Task 5 hängen. **Nur lesen.**

- [ ] **Step 1: Meldet sich `/api/v1` beim Türsteher an oder nimmt es Bearer direkt?**

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://crm.hirschfeld.at/api/v1/contacts
```

- `401` oder `403` (Antwort vom CRM selbst): `/api/v1` ist am Türsteher vorbei erreichbar, die eigene Bearer-Prüfung ist die einzige Sperre. Dann ist `safeEqual` (Task 1) besonders wichtig.
- `302` auf `auth.hirschfeld.at`: der Türsteher steht auch davor. Henry muss dann über einen anderen Weg (SSH-Tunnel oder Ausnahme-Regel) zugreifen. Aufschreiben, nicht ändern.

- [ ] **Step 2: Ist der Container-Port von außen direkt erreichbar?**

Den SSH-Alias und den Compose-Pfad aus `deploy.sh` übernehmen (`grep -n "HETZNER=\|COMPOSE_PATH=\|APP_ID=" deploy.sh`), dann:

```bash
ssh "$HETZNER" "docker ps --format '{{.Names}}  {{.Ports}}' | grep -i crm"
```

- Steht dort `0.0.0.0:…->3000/tcp`, ist der Port direkt erreichbar: der Header `Remote-User` ist fälschbar. Entscheidung 2a lautet dann **nicht vertrauen**.
- Steht dort nur `3000/tcp` (ohne Host-Port), erreicht man das CRM nur über Traefik. Vertrauen ist vertretbar, sofern Traefik den Header überschreibt.

- [ ] **Step 3: Steht `TEABLE_API_KEY` schon in den Laufzeit-Variablen des Containers?**

```bash
ssh "$HETZNER" "grep -c TEABLE_API_KEY $COMPOSE_PATH"
```

Nur die Anzahl, nie den Wert ausgeben. `0` heißt: der Schlüssel steckt heute **nur** im Image. Dann muss er vor Task 8 in Coolify als Laufzeit-Variable eingetragen werden (vor Task 8; Live-Änderung, Felix' Ja nötig; Coolify-`$`-Falle beachten: `is_literal` setzen).

- [ ] **Step 4: Ergebnis an Felix**

Drei Zeilen: Bearer-Zugang ja/nein hinter Türsteher, Port offen ja/nein, Schlüssel in Compose ja/nein. Daraus entscheiden Felix und der Ausführende 2a (Header-Vertrauen) und ob 2b/2c vor Task 9 gebraucht werden.

---

### Task 1: Sicherer Vergleich

**Files:**
- Create: `src/lib/server/safe-equal.ts`
- Test: `tests/safe-equal.test.ts`
- Modify: `src/lib/api-auth.ts:11-19`

**Interfaces:**
- Produces: `safeEqual(a: string | null | undefined, b: string | null | undefined): boolean`. Leer oder fehlend ist immer `false`.

- [ ] **Step 1: Failing test**

`tests/safe-equal.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual } from '../src/lib/server/safe-equal.ts';

test('gleiche Texte sind gleich', () => {
  assert.equal(safeEqual('geheim-123', 'geheim-123'), true);
});

test('verschiedene Texte, auch verschiedener Länge, sind ungleich', () => {
  assert.equal(safeEqual('geheim-123', 'geheim-124'), false);
  assert.equal(safeEqual('kurz', 'viel-laenger-als-kurz'), false);
});

test('leer oder fehlend ist nie gleich, auch nicht leer gegen leer', () => {
  assert.equal(safeEqual('', ''), false);
  assert.equal(safeEqual(undefined, undefined), false);
  assert.equal(safeEqual(null, 'x'), false);
  assert.equal(safeEqual('x', undefined), false);
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/safe-equal.test.ts`
Expected: FAIL, Modul fehlt.

- [ ] **Step 3: Implementieren**

`src/lib/server/safe-equal.ts`:

```ts
import { createHash, timingSafeEqual } from 'node:crypto';

/** Vergleich in konstanter Zeit. Leer oder fehlend gilt nie als gleich (fail-closed). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/safe-equal.test.ts`
Expected: 3 Tests PASS.

- [ ] **Step 5: `api-auth.ts` umstellen**

Import oben:

```ts
import { safeEqual } from '$lib/server/safe-equal';
```

Den Vergleich `if (token !== process.env.CRM_API_KEY) {` ersetzen durch:

```ts
  if (!safeEqual(token, process.env.CRM_API_KEY)) {
```

(`CRM_API_KEY` nicht gesetzt ergibt `false`, also Verweigerung.)

- [ ] **Step 6: Henry-Zugang weiter prüfen**

Run: `./dev.sh`, dann in einem zweiten Terminal (Schlüssel aus `.env` laden, nicht ausgeben):

```bash
set -a; . ./.env; set +a
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CRM_API_KEY" http://localhost:5174/api/v1/contacts
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer falsch" http://localhost:5174/api/v1/contacts
```

Expected: `200` und `403`. Falls `CRM_API_KEY` lokal nicht gesetzt ist, meldet der erste Aufruf `403`. Dann den Schlüssel lokal in `.env` ergänzen.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/safe-equal.ts tests/safe-equal.test.ts src/lib/api-auth.ts
git commit -m "fix(security): API-Schlüssel in konstanter Zeit vergleichen, leer = verweigern" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Echtes Session-Token

**Files:**
- Create: `src/lib/server/session.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- Produces: `createSessionToken(secret: string, now: number, ttlMs: number): string` und `verifySessionToken(secret: string, token: string, now: number): boolean`. Format `<ablauf-ms>.<hmac-base64url>`.

Das Token ist zustandslos (kein Server-Speicher). Abmelden löscht das Cookie, gesperrt werden **alle** Sitzungen durch Wechsel von `SESSION_SECRET`. Für einen Einzelnutzer reicht das.

- [ ] **Step 1: Failing test**

`tests/session.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from '../src/lib/server/session.ts';

const SECRET = 'test-secret-mindestens-lang-genug';
const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

test('frisches Token ist gültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  assert.equal(verifySessionToken(SECRET, t, NOW + 1000), true);
});

test('abgelaufenes Token ist ungültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  assert.equal(verifySessionToken(SECRET, t, NOW + DAY + 1), false);
});

test('falsches Geheimnis ist ungültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  assert.equal(verifySessionToken('anderes-geheimnis', t, NOW + 1000), false);
});

test('Ablauf im Token verlängern (Fälschung) ist ungültig', () => {
  const t = createSessionToken(SECRET, NOW, DAY);
  const sig = t.split('.')[1];
  const forged = `${NOW + 365 * DAY}.${sig}`;
  assert.equal(verifySessionToken(SECRET, forged, NOW + DAY + 1), false);
});

test('der alte feste Cookie-Wert und Müll sind ungültig', () => {
  assert.equal(verifySessionToken(SECRET, 'authenticated', NOW), false);
  assert.equal(verifySessionToken(SECRET, '', NOW), false);
  assert.equal(verifySessionToken(SECRET, '.', NOW), false);
  assert.equal(verifySessionToken(SECRET, 'abc.def', NOW), false);
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/session.test.ts`
Expected: FAIL, Modul fehlt.

- [ ] **Step 3: Implementieren**

`src/lib/server/session.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(secret: string, now: number, ttlMs: number): string {
  const exp = String(now + ttlMs);
  return `${exp}.${sign(secret, exp)}`;
}

export function verifySessionToken(secret: string, token: string, now: number): boolean {
  const i = token.indexOf('.');
  if (i < 1) return false;
  const exp = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!/^\d+$/.test(exp) || Number(exp) <= now) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(secret, exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/session.test.ts`
Expected: 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/session.ts tests/session.test.ts
git commit -m "feat(security): signiertes Session-Token mit Ablauf" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Redirect-Ziel und Login-Bremse

**Files:**
- Create: `src/lib/server/safe-next.ts`, `src/lib/server/rate-limit.ts`
- Test: `tests/safe-next.test.ts`, `tests/rate-limit.test.ts`

**Interfaces:**
- Produces: `safeNext(raw: string | null | undefined): string` und `createLimiter(max: number, windowMs: number): { allow(key: string, now: number): boolean }`.

- [ ] **Step 1: Failing tests**

`tests/safe-next.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../src/lib/server/safe-next.ts';

test('eigene Pfade bleiben, samt Query', () => {
  assert.equal(safeNext('/contacts?tags=a'), '/contacts?tags=a');
  assert.equal(safeNext('/'), '/');
});

test('fremde und getarnte Ziele werden zu /', () => {
  assert.equal(safeNext('//evil.com'), '/');
  assert.equal(safeNext('https://evil.com'), '/');
  assert.equal(safeNext('/\\evil.com'), '/');
  assert.equal(safeNext('javascript:alert(1)'), '/');
  assert.equal(safeNext('/ok\r\nSet-Cookie: x=1'), '/');
});

test('leer oder fehlend wird zu /', () => {
  assert.equal(safeNext(''), '/');
  assert.equal(safeNext(null), '/');
  assert.equal(safeNext(undefined), '/');
});
```

`tests/rate-limit.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../src/lib/server/rate-limit.ts';

test('bis zum Limit erlaubt, danach gesperrt', () => {
  const l = createLimiter(3, 1000);
  assert.equal(l.allow('ip', 0), true);
  assert.equal(l.allow('ip', 1), true);
  assert.equal(l.allow('ip', 2), true);
  assert.equal(l.allow('ip', 3), false);
});

test('nach Ablauf des Fensters wieder erlaubt', () => {
  const l = createLimiter(1, 1000);
  assert.equal(l.allow('ip', 0), true);
  assert.equal(l.allow('ip', 500), false);
  assert.equal(l.allow('ip', 1001), true);
});

test('jeder Schlüssel zählt für sich', () => {
  const l = createLimiter(1, 1000);
  assert.equal(l.allow('a', 0), true);
  assert.equal(l.allow('b', 0), true);
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/safe-next.test.ts tests/rate-limit.test.ts`
Expected: FAIL, Module fehlen.

- [ ] **Step 3: Implementieren**

`src/lib/server/safe-next.ts`:

```ts
/** Nur Pfade auf dieser Seite sind als Ziel nach dem Login erlaubt. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/')) return '/';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (/[\r\n\\]/.test(raw)) return '/';
  return raw;
}
```

`src/lib/server/rate-limit.ts`:

```ts
/** Einfache Bremse im Arbeitsspeicher: höchstens `max` Versuche je Schlüssel im Zeitfenster. */
export function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string, now: number): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    }
  };
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/safe-next.test.ts tests/rate-limit.test.ts`
Expected: 6 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/safe-next.ts src/lib/server/rate-limit.ts tests/safe-next.test.ts tests/rate-limit.test.ts
git commit -m "feat(security): sicheres Redirect-Ziel und Login-Bremse" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Türsteher-Entscheidung (rein) und hooks.server.ts

**Files:**
- Create: `src/lib/server/auth-policy.ts`, `src/hooks.server.ts`
- Test: `tests/auth-policy.test.ts`

**Interfaces:**
- Consumes: `verifySessionToken` (Task 2).
- Produces: `decideAuth(input: { pathname: string; dev: boolean; sessionValid: boolean; proxyUser: boolean }): 'allow' | 'login' | 'deny'`.

- [ ] **Step 1: Ausnahmen aus dem echten Bestand bestimmen**

```bash
ls static static/design | head -20
grep -n "manifest\|sw.js\|workbox" vite.config.ts | head
grep -L "checkApiAuth" $(find src/routes/api/v1 -name '+server.ts')
```

Die letzte Zeile muss **leer** sein: jede `/api/v1`-Route ruft `checkApiAuth`. Steht dort eine Datei, ist das eine offene Route und wird zuerst in Task 1 Muster ergänzt. Die Liste der öffentlichen Präfixe unten mit dem Ergebnis der ersten beiden Befehle abgleichen und bei Bedarf anpassen.

- [ ] **Step 2: Failing test**

`tests/auth-policy.test.ts`:

```ts
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
```

- [ ] **Step 3: Fehlschlag sehen**

Run: `node --test tests/auth-policy.test.ts`
Expected: FAIL, Modul fehlt.

- [ ] **Step 4: Implementieren**

`src/lib/server/auth-policy.ts`:

```ts
export type AuthInput = {
  pathname: string;
  dev: boolean;
  sessionValid: boolean;
  proxyUser: boolean;
};

export type AuthDecision = 'allow' | 'login' | 'deny';

function isPublic(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/favicon.png' || pathname === '/manifest.webmanifest') return true;
  return ['/_app/', '/design/', '/icons/', '/sw.js', '/workbox-'].some((p) => pathname.startsWith(p));
}

export function decideAuth(i: AuthInput): AuthDecision {
  if (i.dev) return 'allow';
  if (i.pathname.startsWith('/api/v1/')) return 'allow';
  if (isPublic(i.pathname)) return 'allow';
  if (i.sessionValid || i.proxyUser) return 'allow';
  return i.pathname.startsWith('/api/') ? 'deny' : 'login';
}
```

- [ ] **Step 5: Erfolg sehen**

Run: `node --test tests/auth-policy.test.ts`
Expected: 6 Tests PASS.

- [ ] **Step 6: Hook schreiben**

`src/hooks.server.ts`:

```ts
import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { decideAuth } from '$lib/server/auth-policy';
import { verifySessionToken } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname, search } = event.url;

  const secret = process.env.SESSION_SECRET ?? '';
  const token = event.cookies.get('crm_session') ?? '';
  const sessionValid = !!secret && !!token && verifySessionToken(secret, token, Date.now());
  const proxyUser =
    process.env.TRUST_PROXY_USER === '1' && !!event.request.headers.get('remote-user');

  const decision = decideAuth({ pathname, dev, sessionValid, proxyUser });

  if (decision === 'deny') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (decision === 'login') {
    throw redirect(303, `/login?next=${encodeURIComponent(pathname + search)}`);
  }

  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
};
```

Eine strenge Content-Security-Policy ist bewusst **nicht** dabei: SvelteKit braucht dafür eine Nonce-Konfiguration, das wäre ein eigener Task.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/auth-policy.ts src/hooks.server.ts tests/auth-policy.test.ts
git commit -m "feat(security): zentraler Türsteher in hooks.server.ts" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Noch **nicht** ausrollen: ohne Task 5 könnte sich niemand mehr anmelden.

---

### Task 5: Login, Logout, Layout

**Files:**
- Modify: `src/routes/login/+page.server.ts` (ganze Datei)
- Create: `src/routes/logout/+server.ts`
- Modify: `src/routes/+layout.server.ts` (ganze Datei)

**Interfaces:**
- Consumes: `safeEqual`, `createSessionToken`, `verifySessionToken`, `safeNext`, `createLimiter`.

- [ ] **Step 1: Login neu schreiben**

`src/routes/login/+page.server.ts`:

```ts
import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { safeEqual } from '$lib/server/safe-equal';
import { createSessionToken, verifySessionToken } from '$lib/server/session';
import { safeNext } from '$lib/server/safe-next';
import { createLimiter } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Hinter dem Proxy sehen alle dieselbe Adresse. 10 Versuche je 15 Minuten reichen für Tippfehler
// und bremsen ein Skript.
const limiter = createLimiter(10, 15 * 60 * 1000);

export const load: PageServerLoad = async ({ cookies }) => {
  const secret = process.env.SESSION_SECRET ?? '';
  const token = cookies.get('crm_session') ?? '';
  if (secret && token && verifySessionToken(secret, token, Date.now())) {
    throw redirect(303, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url, getClientAddress }) => {
    const secret = process.env.SESSION_SECRET;
    const expected = process.env.CRM_PASSWORD;
    if (!secret || !expected) return fail(503, { error: 'Anmeldung ist nicht eingerichtet' });

    if (!limiter.allow(getClientAddress(), Date.now())) {
      return fail(429, { error: 'Zu viele Versuche, bitte in 15 Minuten erneut' });
    }

    const password = String((await request.formData()).get('password') ?? '');
    if (!safeEqual(password, expected)) return fail(401, { error: 'Falsches Passwort' });

    cookies.set('crm_session', createSessionToken(secret, Date.now(), TTL_MS), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !dev,
      maxAge: TTL_MS / 1000
    });

    throw redirect(303, safeNext(url.searchParams.get('next')));
  }
};
```

- [ ] **Step 2: Logout**

`src/routes/logout/+server.ts`:

```ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete('crm_session', { path: '/' });
  throw redirect(303, '/login');
};
```

Einen Abmelde-Knopf in der Oberfläche baut Runde 3. Bis dahin: Cookie im Browser löschen oder `curl -X POST`.

- [ ] **Step 3: Layout-Prüfung entfernen (der Hook macht das jetzt)**

`src/routes/+layout.server.ts` ersetzen durch:

```ts
import type { LayoutServerLoad } from './$types';

// Anmeldung prüft src/hooks.server.ts für jede Anfrage.
export const load: LayoutServerLoad = async () => ({});
```

- [ ] **Step 4: Lokal ausprobieren, im Produktionsmodus**

Der Dev-Modus umgeht die Prüfung absichtlich. Deshalb im gebauten Zustand testen:

```bash
set -a; . ./.env; set +a
export SESSION_SECRET="$(openssl rand -hex 32)"
npm run build && PORT=3100 node build &
sleep 2
curl -s -o /dev/null -w "Seite ohne Login: %{http_code} -> %{redirect_url}\n" http://localhost:3100/contacts
curl -s -o /dev/null -w "API ohne Login: %{http_code}\n" http://localhost:3100/api/search?q=a
curl -s -o /dev/null -w "Fälschung: %{http_code}\n" -H "Cookie: crm_session=authenticated" http://localhost:3100/api/search?q=a
curl -s -o /dev/null -w "Bearer v1: %{http_code}\n" -H "Authorization: Bearer $CRM_API_KEY" http://localhost:3100/api/v1/contacts
kill %1
```

Expected: `303 -> /login?next=%2Fcontacts`, `401`, `401`, `200`.

- [ ] **Step 5: Anmeldung im Browser**

Server wie oben starten, `http://localhost:3100/contacts` öffnen. Erwartet: Login-Seite, Passwort aus `.env` eingeben, Weiterleitung zurück auf `/contacts`. Zehnmal falsch eingeben: ab dem elften Versuch „Zu viele Versuche".

- [ ] **Step 6: Commit**

```bash
git add src/routes/login/+page.server.ts src/routes/logout/+server.ts src/routes/+layout.server.ts
git commit -m "fix(security): echte Sitzung, Login-Bremse, sicheres Ziel, Logout" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Markdown ohne Skript-Einschleusung

**Files:**
- Create: `src/lib/markdown.ts`
- Test: `tests/markdown.test.ts`
- Modify: `src/lib/components/TimelineItem.svelte:6,40`

**Interfaces:**
- Produces: `renderMarkdown(src: string): string`. Rohes HTML im Text wird als sichtbarer Text ausgegeben, Bilder entfallen (das verhindert auch Tracking-Pixel aus Mails), Links nur `http`, `https`, `mailto`, `tel`.

- [ ] **Step 1: Bisherige `marked`-Optionen ermitteln**

```bash
grep -rn "marked" src --include=*.svelte --include=*.ts | grep -v "^src/lib/markdown.ts"
```

Falls irgendwo `marked.setOptions` oder `marked.use` steht, dieselben Optionen in `new Marked({...})` unten übernehmen. Sonst gilt der Standard (`gfm: true`).

- [ ] **Step 2: Failing test**

`tests/markdown.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/markdown.ts';

test('normales Markdown funktioniert', () => {
  const html = renderMarkdown('**fett** und _kursiv_');
  assert.match(html, /<strong>fett<\/strong>/);
  assert.match(html, /<em>kursiv<\/em>/);
});

test('rohes HTML wird zu Text, nicht ausgeführt', () => {
  const html = renderMarkdown('hallo <img src=x onerror=alert(1)> welt');
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /&lt;img/);
});

test('script-Block wird neutralisiert', () => {
  const html = renderMarkdown('<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script/i);
});

test('javascript-Links werden zu reinem Text', () => {
  const html = renderMarkdown('[klick](javascript:alert(1))');
  assert.doesNotMatch(html, /href/i);
  assert.match(html, /klick/);
});

test('https- und mailto-Links bleiben, mit sicheren Attributen', () => {
  const html = renderMarkdown('[a](https://example.com) [m](mailto:x@y.at)');
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /rel="noopener noreferrer nofollow"/);
  assert.match(html, /href="mailto:x@y\.at"/);
});

test('Bilder entfallen (kein Tracking-Pixel)', () => {
  const html = renderMarkdown('![pixel](https://tracker.example/p.gif)');
  assert.doesNotMatch(html, /<img/i);
});
```

- [ ] **Step 3: Fehlschlag sehen**

Run: `node --test tests/markdown.test.ts`
Expected: FAIL, Modul fehlt.

- [ ] **Step 4: Implementieren**

`src/lib/markdown.ts`:

```ts
import { Marked } from 'marked';

const SAFE_URL = /^(https?:|mailto:|tel:)/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const md = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    image({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (!SAFE_URL.test(href.trim())) return inner;
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(href)}"${t} target="_blank" rel="noopener noreferrer nofollow">${inner}</a>`;
    }
  }
});

/** Markdown zu HTML, ohne rohes HTML, ohne Bilder, nur sichere Links. */
export function renderMarkdown(src: string): string {
  return md.parse(src, { async: false }) as string;
}
```

- [ ] **Step 5: Erfolg sehen**

Run: `node --test tests/markdown.test.ts`
Expected: 6 Tests PASS. Falls die Renderer-Signatur in `marked` 18 abweicht (Fehler „parser undefined" oder ähnlich), `node_modules/marked/lib/marked.d.ts` ansehen und `link`/`html`/`image` an die dort dokumentierten Token-Parameter anpassen; die Tests bleiben unverändert und definieren das Soll.

- [ ] **Step 6: In die Timeline einbauen**

`src/lib/components/TimelineItem.svelte`: Zeile 6 `import { marked } from 'marked';` ersetzen durch

```ts
  import { renderMarkdown } from '$lib/markdown';
```

Zeile 40 ersetzen durch

```ts
  const renderedMarkdown = $derived(entry.inhalt ? renderMarkdown(entry.inhalt) : '');
```

- [ ] **Step 7: Von Hand prüfen**

`./dev.sh`, einen Kontakt öffnen, eine Notiz mit dem Text `**Test** <img src=x onerror=alert(1)>` anlegen. Erwartet: „Test" fett, der `<img …>`-Text steht sichtbar da, kein Dialog erscheint. Die Notiz danach wieder entfernen (Felix entscheidet).

- [ ] **Step 8: Commit**

```bash
git add src/lib/markdown.ts tests/markdown.test.ts src/lib/components/TimelineItem.svelte
git commit -m "fix(security): Markdown ohne rohes HTML und ohne gefährliche Links (XSS)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Eingaben und Uploads begrenzen

**Files:**
- Create: `src/lib/server/validation.ts`
- Test: `tests/validation.test.ts`
- Modify: `src/routes/api/extract-card/+server.ts:41-43`
- Modify: `src/routes/api/contacts/[id]/photo/+server.ts:8-11`
- Modify: `src/routes/api/contacts/[id]/files/+server.ts:15-17`
- Modify: `src/routes/contacts/+page.server.ts` (Actions `update` und `delete`)

**Interfaces:**
- Produces: `isRecordId(v: unknown): v is string`, `checkUpload(file: { size: number; type: string }, opts: { maxBytes: number; types?: string[] }): string | null` (Fehlertext oder `null`), Konstante `IMAGE_TYPES`.

- [ ] **Step 1: Echte ID-Form bestätigen**

```bash
grep -rhoE '\brec[A-Za-z0-9]{10,20}\b' src tests docs 2>/dev/null | head -3
```

Damit das Muster nicht zu streng wird, mit einem echten Beispiel abgleichen. Das Muster unten (`rec` plus 10 bis 20 Zeichen) ist bewusst großzügig.

- [ ] **Step 2: Failing test**

`tests/validation.test.ts`:

```ts
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
```

- [ ] **Step 3: Fehlschlag sehen**

Run: `node --test tests/validation.test.ts`
Expected: FAIL, Modul fehlt.

- [ ] **Step 4: Implementieren**

`src/lib/server/validation.ts`:

```ts
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];

const RECORD_ID = /^rec[A-Za-z0-9]{10,20}$/;

export function isRecordId(v: unknown): v is string {
  return typeof v === 'string' && RECORD_ID.test(v);
}

export function checkUpload(
  file: { size: number; type: string },
  opts: { maxBytes: number; types?: string[] }
): string | null {
  if (file.size > opts.maxBytes) {
    return `Datei zu groß (höchstens ${Math.round(opts.maxBytes / 1024 / 1024)} MB)`;
  }
  if (opts.types && !opts.types.includes(file.type)) return 'Dateityp nicht erlaubt';
  return null;
}
```

- [ ] **Step 5: Erfolg sehen**

Run: `node --test tests/validation.test.ts`
Expected: 5 Tests PASS.

- [ ] **Step 6: In die Routen einbauen**

In allen drei Upload-Routen oben importieren:

```ts
import { checkUpload, IMAGE_TYPES } from '$lib/server/validation';
```

`api/extract-card/+server.ts`, nach `if (!file) throw error(400, 'Kein Bild');`:

```ts
  const problem = checkUpload(file, { maxBytes: 8 * 1024 * 1024, types: IMAGE_TYPES });
  if (problem) throw error(400, problem);
```

`api/contacts/[id]/photo/+server.ts`, nach `if (!file) throw error(400, 'Kein Bild');` dieselben zwei Zeilen.

`api/contacts/[id]/files/+server.ts`, nach `if (!file) throw error(400, 'Keine Datei');` (ohne Typ-Liste, Dokumente sind erlaubt):

```ts
  const problem = checkUpload(file, { maxBytes: 15 * 1024 * 1024 });
  if (problem) throw error(400, problem);
```

- [ ] **Step 7: ID-Prüfung in `contacts/+page.server.ts`**

Import ergänzen: `import { isRecordId } from '$lib/server/validation';`

Action `update`: direkt nach `const id = d.get('id') as string;`

```ts
    if (!isRecordId(id)) return fail(400, { error: 'Ungültige ID' });
```

Action `delete` ersetzen durch:

```ts
  delete: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id');
    if (!isRecordId(id)) return fail(400, { error: 'Ungültige ID' });
    await deleteRecord(TABLES.kontakteReal, id);
    return { success: true };
  },
```

`fail` ist in der Datei bereits importiert (Action `rename_tag` nutzt es). Dasselbe Muster für `companies/+page.server.ts` und die `[id]`-Actions ergänzen, sobald sie beim Lesen dieselbe Form zeigen; nicht raten, sondern jede Datei ansehen.

- [ ] **Step 8: Von Hand prüfen**

`./dev.sh`: ein Foto (klein) an einem Kontakt hochladen, funktioniert. Eine Datei über 15 MB oder ein `.exe` als Foto: Fehlermeldung, kein Upload. Kontakt bearbeiten und speichern: funktioniert wie zuvor.

- [ ] **Step 9: Commit**

```bash
git add src/lib/server/validation.ts tests/validation.test.ts src/routes/api src/routes/contacts/+page.server.ts
git commit -m "fix(security): Upload-Grenzen und ID-Prüfung bei Kontakt-Änderungen" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Teable-Schlüssel aus dem Image nehmen

**Files:**
- Modify: `src/lib/server/teable.ts:5-17`
- Modify: `Dockerfile:5-8`
- Modify: `deploy.sh` (Zeilen mit `TEABLE_API_KEY` und `--build-arg`)
- Modify: `.env.example`

**Voraussetzung:** Task 0 Step 3. Steht der Schlüssel **nicht** in den Laufzeit-Variablen des Containers, zuerst dort eintragen lassen (Felix' Ja, Coolify, `is_literal` beachten). Sonst startet die neue Version ohne Schlüssel und alles fällt aus.

- [ ] **Step 1: Schlüssel erst bei Gebrauch lesen**

In `src/lib/server/teable.ts` die Zeilen 5–17 (`TEABLE_API_KEY` als Konstante, der `throw` beim Import und `BASE_HEADERS`) ersetzen durch:

```ts
const TEABLE_BASE = (process.env.TEABLE_BASE_URL ?? 'https://teable.hirschfeld.at').replace(/\/$/, '');

function baseHeaders(): Record<string, string> {
  const key = process.env.TEABLE_API_KEY;
  if (!key) throw new Error('TEABLE_API_KEY not set');
  return {
    Authorization: `Bearer ${key}`,
    // WAF on teable.hirschfeld.at blocks default Node/undici user-agents. Do not remove.
    'User-Agent': 'curl/8'
  };
}
```

Danach jede Stelle finden, die `BASE_HEADERS` nutzt, und durch `baseHeaders()` ersetzen:

```bash
grep -n "BASE_HEADERS\|TEABLE_API_KEY" src/lib/server/teable.ts
```

Expected danach: nur noch `baseHeaders()`-Aufrufe und der eine Zugriff in `baseHeaders`.

- [ ] **Step 2: Dockerfile**

Die vier Zeilen

```
ARG TEABLE_API_KEY
ARG TEABLE_BASE_URL=https://teable.hirschfeld.at
ENV TEABLE_API_KEY=$TEABLE_API_KEY
ENV TEABLE_BASE_URL=$TEABLE_BASE_URL
```

ersetzen durch

```
ARG TEABLE_BASE_URL=https://teable.hirschfeld.at
ENV TEABLE_BASE_URL=$TEABLE_BASE_URL
```

Und `npm install` durch `npm ci` ersetzen (`RUN echo "legacy-peer-deps=true" >> .npmrc && npm ci`), falls `npm ci` lokal fehlerfrei durchläuft. Sonst bei `npm install` bleiben und das notieren.

- [ ] **Step 3: deploy.sh**

Die Zeile `TEABLE_API_KEY=$(grep …)` und den Teil `--build-arg TEABLE_API_KEY='$TEABLE_API_KEY'` im `docker build`-Aufruf entfernen, dazu den erklärenden Kommentar darüber. Der Schlüssel kommt nun nur noch zur Laufzeit aus der Compose-/Coolify-Umgebung.

- [ ] **Step 4: `.env.example` aufräumen**

Inhalt ersetzen durch (nur Namen, keine Werte):

```
TEABLE_API_KEY=
TEABLE_BASE_URL=https://teable.hirschfeld.at
CRM_PASSWORD=
CRM_API_KEY=
SESSION_SECRET=
TRUST_PROXY_USER=0
OPENROUTER_API_KEY=
```

- [ ] **Step 5: Build ohne Schlüssel muss gelingen**

```bash
env -u TEABLE_API_KEY npm run build 2>&1 | tail -5
```

Expected: Build endet ohne Fehler. Vorher scheiterte er genau daran.

- [ ] **Step 6: Laufzeit ohne Schlüssel scheitert laut, mit Schlüssel läuft**

```bash
env -u TEABLE_API_KEY PORT=3101 node build & sleep 2; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3101/login; kill %1
```

Expected: `200` (Login-Seite braucht kein Teable). Danach mit gesetztem Schlüssel `/api/search` nach Anmeldung testen wie in Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/teable.ts Dockerfile deploy.sh .env.example
git commit -m "fix(security): Teable-Schlüssel nur zur Laufzeit, nicht mehr im Docker-Image" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Abschluss und Ausrollen (nur mit Felix)

- [ ] **Step 1: Alles testen**

Run: `npm test`
Expected: alle Tests grün.

- [ ] **Step 2: Vorbereitung auf dem Server, nur mit Felix' Ja**

Felix entscheidet und macht bzw. erlaubt:
1. `SESSION_SECRET` in Coolify anlegen (zufällig, 32 Byte hex). Entscheidung 2b.
2. `TRUST_PROXY_USER` setzen oder weglassen. Entscheidung 2a: Nach Task 0 Step 2.
3. Falls Task 0 Step 3 `0` ergab: `TEABLE_API_KEY` als Laufzeit-Variable eintragen.

Ohne 1. sperrt der neue Login **alle** aus (fail-closed, gewollt).

- [ ] **Step 3: Erst nach „deploy das": ausrollen**

```bash
./deploy.sh
```

- [ ] **Step 4: Nach dem Deploy prüfen**

```bash
curl -s -o /dev/null -w "Seite: %{http_code} -> %{redirect_url}\n" https://crm.hirschfeld.at/contacts
curl -s -o /dev/null -w "API: %{http_code}\n" "https://crm.hirschfeld.at/api/search?q=a"
curl -s -o /dev/null -w "Fälschung: %{http_code}\n" -H "Cookie: crm_session=authenticated" "https://crm.hirschfeld.at/api/search?q=a"
```

Expected: Weiterleitung, dann jeweils Abweisung bzw. Weiterleitung an den Türsteher (`302` oder `401`), nie `200`. Zusätzlich im Browser anmelden und Henrys Zugang (`/api/v1/contacts` mit Bearer) prüfen.

- [ ] **Step 5: Danach: Schlüssel drehen (Entscheidung 2c)**

Der alte `TEABLE_API_KEY` steckt in den Schichten der früheren Images. Felix erneuert das Teable-Token und trägt das neue in Coolify und `.env` ein. Dafür schlägt Henry einen Todoist-Eintrag vor (legt ihn erst nach Felix' Ja an).

- [ ] **Step 6: Dokumentation**

`data/work-log.json`, Werkbank, Ein-Satz-Changelog: „CRM Runde 2: Login im Code, signierte Sitzung, XSS-Schutz, Upload-Grenzen, Schlüssel aus dem Image."

## Self-Review (gegen `3-code.md`)

- Befund 1 (kein Türsteher): Task 4 (`hooks.server.ts`, `decideAuth`), Task 5. ✔
- Befund 2 (fälschbares Cookie, kein `secure`): Task 2, Task 5. Der Test „alter fester Wert ist ungültig" nagelt es fest. ✔
- Befund 3 (Header blind geglaubt): `TRUST_PROXY_USER=1` als Schalter, Standard aus (Task 4 Step 6), Entscheidung in Task 0/9. ✔
- Befund 4 (XSS): Task 6. ✔
- Befund 5 (Vergleich, Bremse, Schlüssel im Image): Tasks 1, 3, 5, 8. ✔
- Befund 7 (Eingaben, Uploads, `next`): Tasks 3, 7. Nicht abgedeckt, mit Absicht: `parseInt`-Fallback und `tags`-Typprüfung in `api/v1/contacts` und `api/views` (`request.json()` ohne try/catch): eigene kleine Runde, da kein Sicherheitsloch, nur 500er.
- Befund 8 (Header, Fonts lokal, Fehlertexte): Header in Task 4. **Nicht** in dieser Runde: Content-Security-Policy, lokale Fonts, generische Fehlertexte. Ein eigener Task in Runde 3.
- Befunde 6, 9, 10 (Performance, Barrierefreiheit, Tests): Runde 3 bzw. Runde 1.
- Typkonsistenz: `safeEqual` (Task 1 → 5), `createSessionToken`/`verifySessionToken` (Task 2 → 4, 5), `safeNext`, `createLimiter` (Task 3 → 5), `decideAuth` (Task 4), `isRecordId`/`checkUpload`/`IMAGE_TYPES` (Task 7): Namen und Signaturen stimmen überall überein.
- Reihenfolge: Task 4 allein ausgerollt würde alle aussperren, deshalb rollt Task 9 alles zusammen aus.
