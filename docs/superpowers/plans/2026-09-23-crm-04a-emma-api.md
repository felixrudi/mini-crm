# CRM Runde 4a — API für Emma: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das CRM bekommt drei Dinge, die Emma Mail (Runde 4b, separater Plan) zum Lesen und Schreiben braucht: ein Domain-Feld an der Firma, ein exaktes E-Mail-Lookup auf `/api/v1/contacts`, und eine neue `POST /api/v1/interactions`-Route für den „Vermerk ins CRM übernehmen"-Knopf — plus die Authelia-Freigabe, ohne die kein externer Server Emma-Mail überhaupt bis zur App durchkommt.

**Architecture:** Reine Matching-Logik (E-Mail-Vergleich bei mehreren, komma-getrennten Adressen) wandert in ein neues, framework-freies Modul unter `src/lib/`, testbar mit `node --test` — genau das Muster aus `src/lib/firma-match.ts` (Runde 1). Die beiden neuen/geänderten `+server.ts`-Routen bleiben dünne Wrapper, die dieses Modul aufrufen. Jede neue `/api/v1/**`-Route ruft `checkApiAuth` auf — das ist keine Stilfrage, sondern durch `tests/api-v1-guarded.test.ts` erzwungen.

**Tech Stack:** SvelteKit 2, TypeScript, Node 22.21 (`node --test`), Teable REST-API (`teable.hirschfeld.at`), Authelia (Reverse-Proxy-Auth vor `crm.hirschfeld.at`).

**Spec:** `docs/superpowers/plans/2026-09-22-crm-00-uebersicht.md` (Runde-4-Entscheidungen 4a–4d) und `docs/superpowers/plans/2026-09-22-crm-02-absichern.md` (Bearer-Token-Konzept für `/api/v1/*`, offene Frage zu Authelia — hier live geklärt: **Authelia fängt auch `/api/v1/*` ab**, bestätigt 23.09.2026 per `curl` gegen `https://crm.hirschfeld.at/api/v1/contacts` mit ungültigem Bearer-Token → `302` auf `auth.hirschfeld.at`, nicht `401`).

## Global Constraints

- Arbeitsverzeichnis: `/Users/felix/Documents/Programmieren/mini-crm`.
- Tests: nur reine Module, Import mit Endung `.ts` (`../src/lib/x.ts`), kein `$app/…`, kein `$lib/…` in getesteten Modulen. Ausführen mit `npm test`.
- Jede Datei unter `src/routes/api/v1/**/+server.ts` MUSS `checkApiAuth` aufrufen — geprüft von `tests/api-v1-guarded.test.ts`, das den Build sonst rot macht.
- Kein `git push`, kein `./deploy.sh` ohne ausdrückliche Freigabe von Felix.
- Jede Änderung an Login/Authelia/Server-Konfiguration wird vor dem Ausführen von Felix bestätigt (Task 0 und Task 4 dieses Plans sind Live-Änderungen — separat markiert, nicht Teil der normalen Task-für-Task-Ausführung ohne Rückfrage).
- Commit-Nachrichten enden mit der Zeile `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Sprache in der Oberfläche: Deutsch, Sie-Form vermeiden, wie im Bestand.
- Teable-Feldnamen-Konvention: deutsche, großgeschriebene Strings als Werte in `teable-schema.ts` (z. B. `'Domain'`), die JS/TS-seitigen Property-Keys bleiben englisch/kleingeschrieben (`domain`).

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `src/lib/server/teable-schema.ts` | ändern | `FIRMEN_FIELDS.domain = 'Domain'` |
| `src/lib/server/teable-map.ts` | ändern | `mapCompany()` liefert `domain` |
| `src/routes/companies/[id]/+page.server.ts` | ändern | `update`-Action schreibt `domain` |
| `src/routes/companies/[id]/+page.svelte` | ändern | Domain-Eingabefeld im Bearbeiten-Formular |
| `src/routes/api/v1/companies/+server.ts` | ändern | `POST` schreibt `domain` |
| `src/routes/api/v1/companies/[id]/+server.ts` | ändern | `PATCH` schreibt `domain` |
| `src/lib/contact-email-match.ts` | neu | Komma-Listen-fähiger E-Mail-Vergleich |
| `tests/contact-email-match.test.ts` | neu | Tests dazu |
| `src/routes/api/v1/contacts/+server.ts` | ändern | `GET` unterstützt `?email=` exaktes Lookup |
| `src/routes/api/v1/interactions/+server.ts` | neu | `POST` legt eine Interaktion an einem Kontakt an |

---

### Task 0: Domain-Feld live in Teable anlegen (Live-Änderung — braucht Felix' Ja)

**Files:** keine Code-Änderung — reine Infrastruktur gegen `teable.hirschfeld.at`.

**Interfaces:**
- Produces: das Teable-Feld `Domain` (Typ `singleLineText`) existiert auf der Tabelle `Firmen_Real` (`tbl58ahoWar7wVxWHjA`), damit Task 1 dagegen schreiben kann.

- [ ] **Step 1: Prüfen, ob das Feld schon existiert**

```bash
cd /Users/felix/Documents/Programmieren/mini-crm
set -a; . ./.env; set +a
curl -sS "https://teable.hirschfeld.at/api/table/tbl58ahoWar7wVxWHjA/field" \
  -H "Authorization: Bearer $TEABLE_API_KEY" \
  -H "User-Agent: curl/8" | python3 -c "import sys,json; print([f['name'] for f in json.load(sys.stdin)])"
```

Expected: eine Liste von Feldnamen wie `['Name', 'Website', 'Telefon', ...]`, **ohne** `'Domain'`. Steht `'Domain'` schon drin, Step 2 überspringen.

- [ ] **Step 2: Felix' Ja einholen, dann Feld anlegen**

Das ist eine Live-Mutation an der produktiven Teable-Basis — nicht ohne ausdrückliches Ja ausführen.

```bash
curl -sS -X POST "https://teable.hirschfeld.at/api/table/tbl58ahoWar7wVxWHjA/field" \
  -H "Authorization: Bearer $TEABLE_API_KEY" \
  -H "User-Agent: curl/8" \
  -H "Content-Type: application/json" \
  -d '{"name": "Domain", "type": "singleLineText"}'
```

Expected: `200`/`201` mit einem JSON-Objekt, das `"name": "Domain"` enthält.

- [ ] **Step 3: Gegenprobe**

Step 1 wiederholen — `'Domain'` muss jetzt in der Liste stehen.

---

### Task 1: Domain-Feld im Code verdrahten

**Files:**
- Modify: `src/lib/server/teable-schema.ts`
- Modify: `src/lib/server/teable-map.ts`
- Modify: `src/routes/companies/[id]/+page.server.ts`
- Modify: `src/routes/companies/[id]/+page.svelte`
- Modify: `src/routes/api/v1/companies/+server.ts`
- Modify: `src/routes/api/v1/companies/[id]/+server.ts`

**Interfaces:**
- Consumes: `FIRMEN_FIELDS` aus `teable-schema.ts` (bestehende Struktur, Task 0's Teable-Feld).
- Produces: `mapCompany()` liefert `domain: string | null`; `POST`/`PATCH /api/v1/companies` akzeptieren `body.domain`.

Kein eigener Unit-Test für dieses Task — `domain` ist ein reines Passthrough-Feld nach demselben Muster wie `website`/`telefon`, die ebenfalls ungetestet sind (Konvention: nur Module mit echter Logik unter `src/lib/` werden mit `node --test` geprüft, siehe Global Constraints). Die Abnahme läuft über Step 5 (Sichtprobe).

- [ ] **Step 1: Feld im Schema ergänzen**

In `src/lib/server/teable-schema.ts`, im `FIRMEN_FIELDS`-Objekt, nach `tags: 'Tags'` eine Zeile ergänzen:

```typescript
export const FIRMEN_FIELDS = {
  name: 'Name',
  website: 'Website',
  telefon: 'Telefon',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
  notizen: 'Notizen',
  tags: 'Tags',
  domain: 'Domain'
} as const;
```

- [ ] **Step 2: `mapCompany()` erweitern**

In `src/lib/server/teable-map.ts`, in `mapCompany()`, nach der `website`-Zeile ergänzen:

```typescript
    website: (f[FIRMEN_FIELDS.website] as string) ?? null,
    domain: (f[FIRMEN_FIELDS.domain] as string) ?? null,
```

- [ ] **Step 3: Bearbeiten-Formular der Firmen-Detailseite**

In `src/routes/companies/[id]/+page.server.ts`, `actions.update`, nach der `website`-Zeile ergänzen:

```typescript
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.domain]: d.get('domain') || null,
```

In `src/routes/companies/[id]/+page.svelte`:

- Nach `let editWebsite = $state('');` ergänzen: `let editDomain = $state('');`
- In `startEdit()`, nach `editWebsite = data.company.website ?? '';` ergänzen: `editDomain = data.company.domain ?? '';`
- Im Formular, nach dem Website-`<div>`-Block (Step davor bei `placeholder="https://…"`), ein neues Feld einfügen:

```svelte
          <div>
            <label class="block text-xs font-medium text-ink-soft mb-1">Domain</label>
            <input name="domain" type="text" bind:value={editDomain}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="kanzlei.at" />
          </div>
```

- [ ] **Step 4: `/api/v1/companies` mitziehen**

In `src/routes/api/v1/companies/+server.ts`, `POST`, im `createRecord`-Aufruf nach `[FIRMEN_FIELDS.website]:` ergänzen:

```typescript
    [FIRMEN_FIELDS.website]: (body.website as string) || null,
    [FIRMEN_FIELDS.domain]: (body.domain as string) || null,
```

In `src/routes/api/v1/companies/[id]/+server.ts`, `PATCH`, im `updateRecord`-Aufruf nach der `website`-Zeile ergänzen:

```typescript
    [FIRMEN_FIELDS.website]: pick('website', FIRMEN_FIELDS.website),
    [FIRMEN_FIELDS.domain]: pick('domain', FIRMEN_FIELDS.domain),
```

- [ ] **Step 5: Sichtprobe**

`./dev.sh`, im Browser eine Firma öffnen, „Bearbeiten", Domain eintragen (z. B. `kanzlei.at`), Speichern, Seite neu laden — Wert bleibt stehen.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/teable-schema.ts src/lib/server/teable-map.ts \
  src/routes/companies/\[id\]/+page.server.ts src/routes/companies/\[id\]/+page.svelte \
  src/routes/api/v1/companies/+server.ts src/routes/api/v1/companies/\[id\]/+server.ts
git commit -m "$(cat <<'EOF'
feat(companies): Domain-Feld an der Firma (Entscheidung 4b, 23.09.2026)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Exaktes E-Mail-Lookup für Kontakte

**Files:**
- Create: `src/lib/contact-email-match.ts`
- Test: `tests/contact-email-match.test.ts`
- Modify: `src/routes/api/v1/contacts/+server.ts`

**Interfaces:**
- Produces: `splitEmails(raw: string | null | undefined): string[]`, `contactMatchesEmail(contactEmailField: string | null | undefined, wanted: string): boolean` — beide von Task 3 (mail_genie-Seite, Runde 4b) indirekt über die HTTP-Antwort konsumiert, nicht direkt importiert (anderes Repo).

Grund für ein eigenes Modul: Ein Kontakt kann laut Entscheidung 4a (23.09.2026) mehrere E-Mail-Adressen als **Komma-Liste in einem Feld** tragen (kein zweites Feld). Der bestehende `q`-Filter (`GET /api/v1/contacts?q=...`) matcht nur Teilstrings über `Name + Email` kombiniert — für „Wer ist das?" in Emma Mail wird ein **exaktes** Lookup einer einzelnen Absenderadresse gegen eine möglicherweise komma-getrennte Liste gebraucht.

- [ ] **Step 1: Failing Test schreiben**

`tests/contact-email-match.test.ts`:

```typescript
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
```

- [ ] **Step 2: Test laufen lassen, sicherstellen dass er fehlschlägt**

Run: `npm test 2>&1 | grep -A3 "contact-email-match"`
Expected: `FAIL` bzw. Modulfehler „Cannot find module '../src/lib/contact-email-match.ts'".

- [ ] **Step 3: Modul implementieren**

`src/lib/contact-email-match.ts`:

```typescript
export function splitEmails(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function contactMatchesEmail(
  contactEmailField: string | null | undefined,
  wanted: string
): boolean {
  const target = wanted.trim().toLowerCase();
  if (!target) return false;
  return splitEmails(contactEmailField).includes(target);
}
```

- [ ] **Step 4: Test laufen lassen, sicherstellen dass er besteht**

Run: `npm test 2>&1 | grep -A3 "contact-email-match"`
Expected: alle Assertions grün, `0 fail`. (Nachtrag nach Ausführung: es sind 7 `test()`-Blöcke mit 11 Assertions, nicht 8 — die Zahl 8 hier war eine falsche Vorab-Schätzung, siehe Ganzbranch-Review Minor #6.)

- [ ] **Step 5: In die Route verdrahten**

In `src/routes/api/v1/contacts/+server.ts`:

```typescript
import { listRecords, createRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import { contactMatchesEmail } from '$lib/contact-email-match';
import type { RequestHandler } from './$types';

// GET /api/v1/contacts?q=...&tag=...&email=...&limit=50
export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = (url.searchParams.get('q') || '').toLowerCase();
  const email = (url.searchParams.get('email') || '').trim();
  const tag = url.searchParams.get('tag') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name]]));

  let filtered = kontakteRecs;
  if (email) {
    // Exaktes Lookup hat Vorrang vor der Teilstring-Suche — für "Wer ist das?" (Emma Mail)
    // ist ein einzelner Absender gemeint, kein unscharfer Treffer.
    filtered = filtered.filter((r) => contactMatchesEmail(r.fields[KONTAKTE_FIELDS.email] as string | null, email));
  } else if (q) {
    filtered = filtered.filter((r) => `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase().includes(q));
  }
  if (tag) {
    filtered = filtered.filter((r) => ((r.fields[KONTAKTE_FIELDS.tags] as string[]) ?? []).includes(tag));
  }

  const contacts = filtered
    .slice(0, limit)
    .map((r): Record<string, unknown> => ({ id: r.id, ...r.fields, company_name: firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null }))
    .sort((a, b) => String(a[KONTAKTE_FIELDS.name]).localeCompare(String(b[KONTAKTE_FIELDS.name])));

  return jsonOk({ contacts });
};
```

(`POST` bleibt unverändert — nur der `GET`-Handler-Block wird ersetzt.)

- [ ] **Step 6: Alle Tests laufen lassen**

Run: `npm test`
Expected: 0 fail, neue Testdatei mit eingerechnet.

- [ ] **Step 7: Commit**

```bash
git add src/lib/contact-email-match.ts tests/contact-email-match.test.ts src/routes/api/v1/contacts/+server.ts
git commit -m "$(cat <<'EOF'
feat(api): exaktes E-Mail-Lookup auf /api/v1/contacts (Entscheidung 4a, 23.09.2026)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `POST /api/v1/interactions`

**Files:**
- Create: `src/routes/api/v1/interactions/+server.ts`

**Interfaces:**
- Consumes: `createRecord`, `link` aus `$lib/server/teable`; `TABLES.interaktionenReal`, `INTERAKTIONEN_FIELDS` aus `$lib/server/teable-schema`; `checkApiAuth`, `jsonOk`, `jsonError` aus `$lib/api-auth` (alle bestehend).
- Produces: `POST /api/v1/interactions` mit Body `{ contact_id: string, typ?: string, titel?: string, text?: string, datum?: string }` → `201` mit `{ interaction: { id, ...fields } }`. Wird von Emma Mail (Runde 4b, `backend/crm.py::CrmClient.create_interaction`) aufgerufen.

Kein eigener Unit-Test — diese Route ist reines Wiring nach exakt demselben, ungetesteten Muster wie das bestehende `POST /api/v1/contacts` (Task 2 im Absichern-Plan Runde 2). Abgesichert wird sie ausschließlich durch `checkApiAuth` + `tests/api-v1-guarded.test.ts` (Step 3) und eine manuelle `curl`-Probe (Step 2).

- [ ] **Step 1: Route implementieren**

`src/routes/api/v1/interactions/+server.ts`:

```typescript
import { createRecord, link } from '$lib/server/teable';
import { TABLES, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// POST /api/v1/interactions
// Body: { contact_id: string, typ?: string, titel?: string, text?: string, datum?: string }
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const contactId = (body.contact_id as string)?.trim();
  if (!contactId) return jsonError('contact_id is required');

  const rec = await createRecord(TABLES.interaktionenReal, {
    [INTERAKTIONEN_FIELDS.kontakt]: link(contactId),
    [INTERAKTIONEN_FIELDS.typ]: (body.typ as string) || 'email',
    [INTERAKTIONEN_FIELDS.datum]: (body.datum as string) || new Date().toISOString(),
    [INTERAKTIONEN_FIELDS.titel]: (body.titel as string) || null,
    [INTERAKTIONEN_FIELDS.text]: (body.text as string) || null
  });

  return jsonOk({ interaction: { id: rec.id, ...rec.fields } }, 201);
};
```

- [ ] **Step 2: Manuelle Probe gegen die lokale Dev-Instanz**

```bash
./dev.sh &
sleep 2
curl -sS -X POST "http://localhost:5173/api/v1/interactions" \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contact_id": "<eine echte Kontakt-ID aus der laufenden Instanz>", "typ": "email", "titel": "Testvermerk", "text": "Probe aus Task 3"}'
```

Expected: `201` mit `{"interaction": {"id": "rec...", ...}}`. Danach den Testvermerk am betroffenen Kontakt im UI wieder löschen (Timeline-Eintrag → Löschen).

- [ ] **Step 3: Guard-Test laufen lassen**

Run: `npm test 2>&1 | grep -A3 "checkApiAuth"`
Expected: grün — die neue Route ruft `checkApiAuth` bereits im ersten Statement auf.

- [ ] **Step 4: Alle Tests**

Run: `npm test`
Expected: 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/v1/interactions/+server.ts
git commit -m "$(cat <<'EOF'
feat(api): POST /api/v1/interactions für Emma Mails Vermerk-Knopf (Entscheidung 4c, 23.09.2026)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Authelia lässt `/api/v1/*` durch (Live-Server-Änderung — braucht Felix' Ja)

**Files:** keine Code-Änderung in diesem Repo — Authelia-Konfiguration auf dem Hetzner-Server (`root@204.168.144.189`, gleiche Box wie `emma.hirschfeld.at`, siehe `mail_genie`-Handoff vom 22.09.2026).

**Interfaces:**
- Produces: `curl -H "Authorization: Bearer <falscher-token>" https://crm.hirschfeld.at/api/v1/contacts` antwortet mit `401`/`403` (App-JSON), nicht mehr mit `302` auf `auth.hirschfeld.at`.

Live bestätigt (23.09.2026): der bestehende Authelia-Wildcard-Rule für `crm.hirschfeld.at` fängt aktuell **auch** `/api/v1/*` ab, bevor `checkApiAuth()` in der App überhaupt greift — Emma Mail (Runde 4b) käme also nie bis zur JSON-Antwort durch. Entscheidung Felix, 23.09.2026: Bypass-Regel für `/api/v1/*`, Absicherung bleibt über `CRM_API_KEY` in der App bestehen (nicht: IP-Whitelist).

- [ ] **Step 1: Authelia-Konfiguration auf dem Server finden**

```bash
ssh root@204.168.144.189 "grep -rl 'crm.hirschfeld.at' /data 2>/dev/null | grep -i authelia"
```

Falls das nichts findet: nach `access_control` oder `configuration.yml` suchen, analog zu der `one_factor`-Änderung für `emma.hirschfeld.at` (siehe `mail_genie/berichte/0917-plan-hetzner-deploy.md`, Entscheidung E4).

- [ ] **Step 2: Bestehende Regel für `crm.hirschfeld.at` ansehen**

Die Datei aus Step 1 öffnen (z. B. `ssh root@204.168.144.189 "cat <pfad>"`), die `access_control.rules`-Sektion für `crm.hirschfeld.at` identifizieren.

- [ ] **Step 3: Felix' Ja einholen, dann Bypass-Regel ergänzen**

Live-Server-Änderung — nicht ohne ausdrückliches Ja ausführen. Vor der bestehenden `crm.hirschfeld.at`-Regel eine speziellere Regel einfügen (Authelia prüft `access_control.rules` von oben nach unten, erster Treffer gewinnt):

```yaml
      - domain: crm.hirschfeld.at
        resources:
          - '^/api/v1/.*$'
        policy: bypass
      - domain: crm.hirschfeld.at
        policy: one_factor   # oder was auch immer die bestehende Regel schon sagt (Step 2 prüfen)
```

Genaue Einrückung/Werte an die in Step 2 gefundene Datei anpassen — nicht blind einsetzen.

- [ ] **Step 4: Authelia neu laden**

```bash
ssh root@204.168.144.189 "docker restart authelia"
```

(Container-Name in Step 1/2 verifizieren, falls abweichend — z. B. per `docker ps | grep -i authelia`.)

- [ ] **Step 5: Gegenprobe**

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -H "Authorization: Bearer falsch" "https://crm.hirschfeld.at/api/v1/contacts?q=test&limit=1"
```

Expected: `403` (App-JSON „Forbidden", aus `checkApiAuth`), nicht mehr `302`.

```bash
curl -sS "https://crm.hirschfeld.at/api/v1/contacts?q=test&limit=1" -H "Authorization: Bearer $CRM_API_KEY"
```

Expected: `200` mit `{"contacts": [...]}`.

Zusätzlich manuell im Browser prüfen: `https://crm.hirschfeld.at/companies` verlangt weiterhin den Authelia-Login (die Bypass-Regel gilt nur für `/api/v1/*`).

---

### Task 5: Abschluss der Runde

- [ ] **Step 1: Alle Tests**

Run: `npm test`
Expected: alle grün, Integrationstest weiterhin übersprungen, 0 fail. (Tatsächlicher Stand nach Ausführung: 94 vorherige + 7 contact-email-match neue = 101, davon 100 grün + 1 übersprungen.)

- [ ] **Step 2: Build läuft durch**

```bash
set -a; . ./.env; set +a
npm run build 2>&1 | tail -8
```

Expected: Build endet ohne Fehler.

- [ ] **Step 3: Freigabe abwarten**

**Kein Push, kein Deploy**, bis Felix „push das"/„deploy das" sagt. Task 0 und Task 4 sind Live-Änderungen und laufen unabhängig vom Push-Zeitpunkt — beide brauchen ihr eigenes Ja, bereits in den jeweiligen Tasks markiert.

- [ ] **Step 4: Dokumentation**

Werkbank (`Henry/modules/werkbank/crm/`: `thema.json` + `protokoll.md`, danach `python3 scripts/werkbank_render.py`), `data/work-log.json`, Ein-Satz-Changelog: „CRM Runde 4a: Domain-Feld, exaktes E-Mail-Lookup, Interaktionen-API und Authelia-Freigabe für Emma Mail."

## Self-Review (gegen Übersicht + Felix' Entscheidungen 23.09.2026)

- 4a (mehrere E-Mail-Adressen, Komma-Liste in einem Feld): Task 2. ✔
- 4b (Domain-Feld an der Firma): Task 1. ✔
- 4c (Vermerk per Knopf, nicht automatisch): ermöglicht durch Task 3 — die Route legt eine Interaktion nur auf expliziten `POST` an, kein automatischer Trigger. ✔
- 4d (vor/nach Server-Umzug): bereits erledigt, Emma Mail läuft seit 22.09.2026 live auf Hetzner — kein Task nötig. ✔
- Offene Frage aus Runde 2 (Authelia vs. `/api/v1/*`): live geklärt (Header „Spec"), Task 4 behebt es. ✔
- Typkonsistenz: `contactMatchesEmail`/`splitEmails` (Task 2) werden nur in `contacts/+server.ts` verwendet — Emma Mail (Runde 4b) konsumiert das Ergebnis nur über die HTTP-JSON-Antwort, kein geteilter Code zwischen den Repos nötig. `link()`/`createRecord()` (Task 3) exakt wie in `src/routes/contacts/[id]/+page.server.ts::actions.add_interaction` (Formular-Pfad) und `api/v1/contacts/+server.ts::POST` (API-Pfad) — keine dritte, abweichende Schreibweise erfunden.
