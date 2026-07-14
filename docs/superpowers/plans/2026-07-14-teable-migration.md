# mini-crm → Teable Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mini-crm's Postgres database with Teable (selfhosted, `teable.hirschfeld.at`) as the sole data store, so contacts/companies/interactions/actions/prospects live in one system instead of two, and unify the two currently-disconnected "prospect" concepts into a single table.

**Architecture:** A new `src/lib/server/teable.ts` client (fetch-based REST wrapper, mirrors the request shapes already proven in `/Users/felix/Documents/Henry/modules/marketing/scripts/*.py`) replaces `src/lib/db.ts`. Every route file that currently runs `postgres.js` tagged-template SQL is rewritten to call the Teable client instead, fetching each table's full record set (Teable tables here are small — low hundreds to low thousands of rows for a solo-user CRM) and filtering/sorting in JS, mirroring the WHERE/ORDER BY logic 1:1. Contact photos and files move from base64-in-Postgres-text to Teable's native Attachment field type. The two current prospect mechanisms (a dead `prospects` table nobody imports into, and a `contacts` tag-based `/prospects/contacts` view) are unified into one Teable `Prospects` table.

**Tech Stack:** SvelteKit 2 + Svelte 5, Node 22, `fetch` (built-in, no new HTTP dependency), Teable REST API. No test runner exists in this repo (no vitest/playwright in package.json) — verification steps in this plan use the local dev server (`./dev.sh` / `vite dev`) + manual checks against the UI and `curl`, not automated tests. This mirrors the project's existing testing culture; do not introduce a new test framework as a side effect of this migration (YAGNI).

## Global Constraints

- **Teable base for CRM data:** reuse the existing `felix_base` (`bseJqfV4E4Ri1QYjUUL`, space `spcX81Be369nUXMq2ey`) — see `/Users/felix/Documents/Henry/data/teable-config.json`. Do not create a new base; this base already holds Felix's other personal tables (workouts, budget).
- **Teable base for mass outreach:** unchanged, `marketing_outreach` (`bseBbF5Z2XiTD0v03Rn`).
- **API auth:** `Authorization: Bearer <TEABLE_API_KEY>` header on every request, key read from `process.env.TEABLE_API_KEY` (set in Coolify env for mini-crm — this is a **new** env var mini-crm doesn't currently have, see Task 10).
- **WAF requirement (verified, do not skip):** every request MUST send `User-Agent: curl/8` — the selfhosted Teable WAF blocks default Node/undici user-agents. Confirmed pattern across every working Henry script (`build_outreach_pool_from_teable.py`, `outreach_abgleich.py`, `pre_send_check.py`).
- **`fieldKeyType=name`:** all reads and writes use field *display names* as JSON keys (not internal `fld...` IDs), confirmed via `ingest_outreach_auswahl.py:52-64` and `outreach_abgleich.py:70-80`. Field names below are exact strings — must match the Teable UI exactly, including spaces/umlauts.
- **Link field asymmetry (verified against live code, not guessed):** write a link field as `[{"id": "recXXXXXXXX"}]` (array, even for single-link fields) — confirmed `ingest_outreach_auswahl.py:121-123`, `budget_teable_update.py:87`. Read a single-link field back as a single object `{"id": "rec...", ...}`, NOT an array — confirmed `outreach_abgleich.py:91-93`.
- **PATCH body shape:** `{"record": {"fields": {...}}, "typecast": true}` (singular `record`, not `records`) — confirmed `budget_teable_update.py:86-104`, the only PATCH call anywhere in the Henry repo.
- **POST (create) body shape:** `{"records": [{"fields": {...}}], "fieldKeyType": "name"}` (plural `records`, array) — confirmed `ingest_outreach_auswahl.py:52-64`.
- **`typecast: true`** on writes — lets Teable auto-create new Single/Multi-Select option values instead of rejecting them (needed for free-form `Tags`).
- **NOT independently verified in this codebase — confirm live before Task 3:** the exact Teable `DELETE /api/table/{tableId}/record/{recordId}` response shape, and the attachment upload endpoint `POST /api/table/{tableId}/record/{recordId}/{fieldName}/uploadAttachment`. Both are documented at `https://help.teable.ai/en/api-doc/overview` but no script in this repo has ever called them — Task 0 is a mandatory spike to confirm the exact shapes against the live instance before any app code depends on them.
- **No retry/rate-limit precedent exists** in the Henry repo (verified: no script has `time.sleep`, backoff, or a Retry adapter). Because this is now a live user-facing app (not a batch script), the client in Task 2 adds a minimal 2-retry-on-5xx safety net that prior scripts didn't need.
- **Data model decision (this pass, flag for Felix to challenge):** the two disconnected mini-crm prospect mechanisms (empty `prospects` table + tag-based `/prospects/contacts`) collapse into **one** `Prospects` Teable table. It serves as the landing zone both for individually-targeted outreach (e.g. a named person you reach out to once) and for contacts pushed over from the mass-outreach Teable base once they reply (a separate, later automation — Task 12, not built here). The old tag-based `/prospects/contacts` route and its Svelte page are deleted in Task 8.
- **Interactions + Emails merge:** the two Postgres tables `interactions` and `emails` (joined today only via the `contact_timeline` VIEW) become one Teable table `Interaktionen_Real`, with `Typ` extended to include `email_rein`/`email_raus` alongside the existing interaction types. This removes the need for a VIEW (Teable has no SQL views) and simplifies the timeline query to one filtered list instead of a UNION.
- **Files/Photos → Attachment fields:** `contacts.photo` (single base64 blob) becomes an `Attachment` field `Foto` (single file) on `Kontakte_Real`. `contact_files` (a whole table of base64 blobs) becomes an `Attachment` field `Dateien` (multiple files) on `Kontakte_Real`. Teable serves attachment URLs directly — no more manual base64 encode/decode in route code.
- **Amounts/dates/text conventions:** none carried over from Henry's document-output rules (this is app code, not a generated document) — follow the existing mini-crm TypeScript/Svelte conventions as-is.
- **Deploy discipline (Felix's standing rule):** every task in Phase C is verified against `./dev.sh` + `localhost` before merge. Nothing is deployed to `crm.hirschfeld.at` until Task 10 (explicit cutover), and only on Felix's explicit "deploy" — do not deploy mid-migration.

---

## File Structure

New files:
- `src/lib/server/teable.ts` — Teable REST client (list/get/create/update/delete/uploadAttachment + link helpers)
- `src/lib/server/teable-schema.ts` — table IDs + exact field-name string constants for every CRM table (single source of truth, avoids magic strings scattered across 19 route files)
- `scripts/migrate-to-teable.ts` — one-time Postgres → Teable data migration (Node, run manually once)
- `scripts/verify-teable-api.ts` — Task 0 spike script (throwaway, confirms DELETE + uploadAttachment shapes)

Modified files (all 19 DB-touching route files, grouped into tasks below) + `package.json` (drop `postgres`, `@anthropic-ai/sdk`) + `.env`/Coolify env (drop `DATABASE_URL`, add `TEABLE_API_KEY`).

Deleted files: `src/lib/db.ts`, `src/routes/prospects/contacts/+page.server.ts`, `src/routes/prospects/contacts/+page.svelte` (and any other file under `src/routes/prospects/contacts/`), `schema-reconstructed.sql` (once migration is verified, moved to `docs/superpowers/plans/2026-07-14-postgres-schema-archive.sql` for historical reference rather than deleted outright).

---

## Task 0: Confirm the two unverified Teable API shapes

**Files:**
- Create: `scripts/verify-teable-api.ts`

**Interfaces:**
- Consumes: `TEABLE_API_KEY`, `TEABLE_BASE_URL` from `.env`
- Produces: printed confirmation of the exact DELETE response shape and uploadAttachment response shape, used to correct Task 2's client if reality differs from the docs

- [ ] **Step 1: Write the spike script**

```ts
// scripts/verify-teable-api.ts
// Throwaway spike — confirms exact API shapes before Task 2 depends on them.
// Run: node --env-file=.env scripts/verify-teable-api.ts
// Delete this file once Task 2 is done and confirmed working.

const BASE = process.env.TEABLE_BASE_URL ?? 'https://teable.hirschfeld.at';
const KEY = process.env.TEABLE_API_KEY as string;
const HEADERS = { Authorization: `Bearer ${KEY}`, 'User-Agent': 'curl/8' };

// Use the existing, known-safe scratch table: create a throwaway record in
// felix_base's `gewicht` table (single numeric field, zero risk to real data),
// then delete it, to observe the exact DELETE response.
const SCRATCH_TABLE = 'tblliWgKCRvZoyBmIte'; // gewicht

async function main() {
  const createRes = await fetch(`${BASE}/api/table/${SCRATCH_TABLE}/record`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: [{ fields: { kg: 0.001 } }],
      fieldKeyType: 'name'
    })
  });
  const created = await createRes.json();
  console.log('CREATE status:', createRes.status);
  console.log('CREATE body:', JSON.stringify(created, null, 2));
  const recordId = created.records[0].id;

  const delRes = await fetch(`${BASE}/api/table/${SCRATCH_TABLE}/record/${recordId}`, {
    method: 'DELETE',
    headers: HEADERS
  });
  const delBody = await delRes.text();
  console.log('DELETE status:', delRes.status);
  console.log('DELETE body:', delBody);

  // Attachment upload spike: uses a real attachment-capable field once Kontakte_Real
  // exists (Task 1 must be done first for this half). Skip if TEST_ATTACH_TABLE/FIELD/RECORD
  // env vars aren't set yet — run this half again after Task 1.
  const attTable = process.env.TEST_ATTACH_TABLE;
  const attField = process.env.TEST_ATTACH_FIELD;
  const attRecord = process.env.TEST_ATTACH_RECORD;
  if (attTable && attField && attRecord) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'text/plain' }), 'spike.txt');
    const upRes = await fetch(
      `${BASE}/api/table/${attTable}/record/${attRecord}/${attField}/uploadAttachment`,
      { method: 'POST', headers: HEADERS, body: form }
    );
    console.log('UPLOAD status:', upRes.status);
    console.log('UPLOAD body:', await upRes.text());
  } else {
    console.log('Skipping attachment spike — set TEST_ATTACH_TABLE/FIELD/RECORD env vars and rerun after Task 1.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run it and record the real shapes**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && node --env-file=.env scripts/verify-teable-api.ts`

Expected: prints CREATE/DELETE status+body. If DELETE status is not 200/204, or the body shape differs from `{"success": true}`-style assumptions, update Task 2's `deleteRecord()` accordingly before writing it.

- [ ] **Step 3: Note findings inline in this plan**

Add a one-line comment under this task recording the actual observed DELETE status code and attachment response shape (fill in after running), so Task 2 is written against confirmed reality, not assumption.

- [ ] **Step 4: Commit the spike script (kept for the record, not deleted yet)**

```bash
git add scripts/verify-teable-api.ts
git commit -m "chore: add Teable API verification spike (Task 0)"
```

---

## Task 1: Create the Teable schema (manual, via Teable UI)

Not a code task — Teable table/field creation was always done by hand in this system (see `modules/werkbank/marketing/scraper/teable-workflow.md`: "3 Tabellen (A/B/C) angelegt... Single-Selects befüllt" — manual, never scripted). No verified API shape exists in this repo for table/field creation, so this stays manual to avoid guessing at an unverified endpoint for something this structural.

**Files:**
- Modify: `/Users/felix/Documents/Henry/data/teable-config.json` (append new table IDs once created)
- Modify: `src/lib/server/teable-schema.ts` (created in Task 2, filled in with real IDs after this task)

- [ ] **Step 1: In base `felix_base` (`bseJqfV4E4Ri1QYjUUL`), create table `Firmen`**

Fields: `Name` (single line text, required), `Website` (URL), `Straße` (single line text), `PLZ` (single line text), `Ort` (single line text), `Land` (single line text), `Notizen` (long text).

- [ ] **Step 2: Create table `Kontakte_Real`**

Fields: `Firma` (link → Firmen, single), `Name` (single line text, required), `Vorname`, `Nachname`, `Titel` (single line text), `Anrede` (single select: Herr, Frau), `Straße`, `PLZ`, `Ort` (single line text), `Geburtstag` (date), `Email` (single line text), `Telefon`, `Telefon 2`, `WhatsApp`, `WeChat-ID` (single line text), `LinkedIn-URL` (URL), `Rolle` (single line text), `Notizen` (long text), `Tags` (multiple select, no predefined options — will auto-populate via `typecast`), `IBAN` (single line text), `Foto` (attachment, single file), `Dateien` (attachment, multiple files). Then add a **Lookup** field `Firma-Name` that looks up `Firmen.Name` through the `Firma` link (replaces the SQL `co.name as company_name` join).

- [ ] **Step 3: Create table `Interaktionen_Real`**

Fields: `Kontakt` (link → Kontakte_Real, single, required), `Typ` (single select: telefonat, besuch, notiz, meeting, whatsapp, wechat, linkedin, signal, sonstiges, email_rein, email_raus), `Datum` (date + time), `Titel` (single line text — merges `zusammenfassung`/`betreff`), `Text` (long text — merges `text`/`body_text`), `Von` (single line text, email only), `An` (single line text, email only).

- [ ] **Step 4: Create table `Aufgaben_Real`**

Fields: `Kontakt` (link → Kontakte_Real, single, optional), `Titel` (single line text, required), `Status` (single select: offen, erledigt — default offen), `Fällig am` (date), `Notizen` (long text).

- [ ] **Step 5: Create table `Prospects`**

Fields: `Name` (single line text, required), `Vorname`, `Nachname`, `Titel` (single line text), `Anrede` (single select: Herr, Frau), `Email` (single line text), `Firma-Text` (single line text — free text from CSV import when no link exists), `Firma` (link → Firmen, single, optional), `Rolle`, `Telefon` (single line text), `Website` (URL), `Notizen` (long text), `Status` (single select: gesendet, geantwortet, termin, kein_interesse, bounce, abgesagt — default gesendet), `Kanal` (single line text, default "email"), `Versandt am` (date), `Follow-up am` (date), `Sperre` (checkbox), `Sperre-Grund` (single line text), `Herkunft` (single select: einzelansprache, mass-outreach — new field, not in old schema, marks where the prospect came from).

- [ ] **Step 6: Record every table ID + the `Firma`/`Kontakt` link field's internal ID**

After creating each table, open it in the Teable UI, copy the table ID from the URL (`tbl...`), and note it. Link field internal IDs aren't needed since all API calls use `fieldKeyType=name`, but double-check the exact display-name spelling matches Task 2's constants exactly (umlauts, hyphens, spaces).

- [ ] **Step 7: Append the new IDs to `data/teable-config.json`**

Edit `/Users/felix/Documents/Henry/data/teable-config.json`, add under `"tables"`:
```json
"crm_firmen": "tbl<real-id>",
"crm_kontakte_real": "tbl<real-id>",
"crm_interaktionen_real": "tbl<real-id>",
"crm_aufgaben_real": "tbl<real-id>",
"crm_prospects": "tbl<real-id>"
```

- [ ] **Step 8: Commit the config update (Henry repo)**

```bash
cd /Users/felix/Documents/Henry
git add data/teable-config.json
git commit -m "docs: add CRM Teable table IDs (Firmen/Kontakte_Real/Interaktionen_Real/Aufgaben_Real/Prospects)"
```

---

## Task 2: Teable client library + schema constants

**Files:**
- Create: `src/lib/server/teable.ts`
- Create: `src/lib/server/teable-schema.ts`

**Interfaces:**
- Produces: `listRecords<F>(tableId)`, `getRecord<F>(tableId, id)`, `createRecord<F>(tableId, fields)`, `updateRecord<F>(tableId, id, fields)`, `deleteRecord(tableId, id)`, `uploadAttachment(tableId, recordId, fieldName, file)`, `link(id)`, `linkId(field)`, `linkIds(field)` — used by every route file in Tasks 4-9.

- [ ] **Step 1: Write `teable.ts`**

```ts
// src/lib/server/teable.ts
// Replaces src/lib/db.ts. Request shapes verified against Henry's working
// Teable scripts (see plan Global Constraints) + Task 0 spike results.

const TEABLE_BASE = (process.env.TEABLE_BASE_URL ?? 'https://teable.hirschfeld.at').replace(/\/$/, '');
const TEABLE_API_KEY = process.env.TEABLE_API_KEY as string;

if (!TEABLE_API_KEY) {
  throw new Error('TEABLE_API_KEY not set');
}

const BASE_HEADERS = {
  Authorization: `Bearer ${TEABLE_API_KEY}`,
  // WAF on teable.hirschfeld.at blocks default Node/undici user-agents — confirmed
  // across every working script in the Henry repo. Do not remove.
  'User-Agent': 'curl/8'
};

export type TeableRecord<F = Record<string, unknown>> = {
  id: string;
  fields: F;
  createdTime?: string;
};

async function teableFetch(path: string, init: RequestInit = {}, attempt = 1): Promise<Response> {
  const res = await fetch(`${TEABLE_BASE}/api${path}`, {
    ...init,
    headers: { ...BASE_HEADERS, ...(init.headers ?? {}) }
  });
  if (!res.ok && res.status >= 500 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 300 * attempt));
    return teableFetch(path, init, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teable ${init.method ?? 'GET'} ${path} -> ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

/** Fetches every record in a table (paginated internally, take=1000/page). */
export async function listRecords<F = Record<string, unknown>>(
  tableId: string
): Promise<TeableRecord<F>[]> {
  const take = 1000;
  let skip = 0;
  const out: TeableRecord<F>[] = [];
  while (true) {
    const res = await teableFetch(`/table/${tableId}/record?take=${take}&skip=${skip}&fieldKeyType=name`);
    const data = (await res.json()) as { records: TeableRecord<F>[] };
    out.push(...data.records);
    if (data.records.length < take) break;
    skip += take;
  }
  return out;
}

export async function getRecord<F = Record<string, unknown>>(
  tableId: string,
  recordId: string
): Promise<TeableRecord<F> | null> {
  const res = await teableFetch(`/table/${tableId}/record/${recordId}?fieldKeyType=name`);
  if (res.status === 404) return null;
  return (await res.json()) as TeableRecord<F>;
}

export async function createRecord<F = Record<string, unknown>>(
  tableId: string,
  fields: Partial<F>
): Promise<TeableRecord<F>> {
  const res = await teableFetch(`/table/${tableId}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], fieldKeyType: 'name', typecast: true })
  });
  const data = (await res.json()) as { records: TeableRecord<F>[] };
  return data.records[0];
}

export async function updateRecord<F = Record<string, unknown>>(
  tableId: string,
  recordId: string,
  fields: Partial<F>
): Promise<TeableRecord<F>> {
  const res = await teableFetch(`/table/${tableId}/record/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record: { fields }, fieldKeyType: 'name', typecast: true })
  });
  return (await res.json()) as TeableRecord<F>;
}

export async function deleteRecord(tableId: string, recordId: string): Promise<void> {
  await teableFetch(`/table/${tableId}/record/${recordId}`, { method: 'DELETE' });
}

export async function uploadAttachment(
  tableId: string,
  recordId: string,
  fieldName: string,
  file: File
): Promise<void> {
  const form = new FormData();
  form.append('file', file, file.name);
  await teableFetch(`/table/${tableId}/record/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`, {
    method: 'POST',
    body: form
    // No Content-Type header — fetch sets the multipart boundary itself.
  });
}

/** Write-side helper: wraps a record id into the array-of-object shape Teable expects for link fields. */
export function link(recordId: string | null | undefined): { id: string }[] | null {
  return recordId ? [{ id: recordId }] : null;
}

/** Read-side helper: a single-link field comes back as one object, not an array. */
export function linkId(field: unknown): string | null {
  if (!field) return null;
  if (Array.isArray(field)) return (field[0] as { id: string } | undefined)?.id ?? null;
  return (field as { id?: string }).id ?? null;
}

/** Read-side helper: pulls a lookup field's plain value out of Teable's response wrapper, if any. */
export function lookupValue<T = string>(field: unknown): T | null {
  if (field == null) return null;
  if (Array.isArray(field)) return (field[0] as T) ?? null;
  return field as T;
}
```

- [ ] **Step 2: Write `teable-schema.ts` with the IDs from Task 1**

```ts
// src/lib/server/teable-schema.ts
// Single source of truth for CRM table IDs + exact field-name strings.
// IDs filled in from Task 1 — replace the tbl_TODO placeholders before Task 3.

export const TABLES = {
  firmen: 'tbl_TODO_firmen',
  kontakteReal: 'tbl_TODO_kontakte_real',
  interaktionenReal: 'tbl_TODO_interaktionen_real',
  aufgabenReal: 'tbl_TODO_aufgaben_real',
  prospects: 'tbl_TODO_prospects'
} as const;

export const FIRMEN_FIELDS = {
  name: 'Name',
  website: 'Website',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
  notizen: 'Notizen'
} as const;

export const KONTAKTE_FIELDS = {
  firma: 'Firma',
  firmaName: 'Firma-Name',
  name: 'Name',
  vorname: 'Vorname',
  nachname: 'Nachname',
  titel: 'Titel',
  anrede: 'Anrede',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  geburtstag: 'Geburtstag',
  email: 'Email',
  telefon: 'Telefon',
  telefon2: 'Telefon 2',
  whatsapp: 'WhatsApp',
  wechatId: 'WeChat-ID',
  linkedinUrl: 'LinkedIn-URL',
  rolle: 'Rolle',
  notizen: 'Notizen',
  tags: 'Tags',
  iban: 'IBAN',
  foto: 'Foto',
  dateien: 'Dateien'
} as const;

export const INTERAKTIONEN_FIELDS = {
  kontakt: 'Kontakt',
  typ: 'Typ',
  datum: 'Datum',
  titel: 'Titel',
  text: 'Text',
  von: 'Von',
  an: 'An'
} as const;

export const AUFGABEN_FIELDS = {
  kontakt: 'Kontakt',
  titel: 'Titel',
  status: 'Status',
  faelligAm: 'Fällig am',
  notizen: 'Notizen'
} as const;

export const PROSPECT_FIELDS = {
  name: 'Name',
  vorname: 'Vorname',
  nachname: 'Nachname',
  titel: 'Titel',
  anrede: 'Anrede',
  email: 'Email',
  firmaText: 'Firma-Text',
  firma: 'Firma',
  rolle: 'Rolle',
  telefon: 'Telefon',
  website: 'Website',
  notizen: 'Notizen',
  status: 'Status',
  kanal: 'Kanal',
  versandtAm: 'Versandt am',
  followupAm: 'Follow-up am',
  sperre: 'Sperre',
  sperreGrund: 'Sperre-Grund',
  herkunft: 'Herkunft'
} as const;
```

- [ ] **Step 3: Manual smoke test against the dev server**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && node --env-file=.env -e "
import('./src/lib/server/teable.ts').then(async (m) => {
  const recs = await m.listRecords('tbl_TODO_firmen'); // use real Firmen table ID from Task 1
  console.log('Firmen records:', recs.length);
})"`

Expected: prints `Firmen records: 0` (table exists but is empty — confirms auth + WAF header + `fieldKeyType` all work end-to-end).

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/teable.ts src/lib/server/teable-schema.ts
git commit -m "feat: add Teable REST client + CRM schema constants"
```

---

## Task 3: One-time data migration (Postgres → Teable)

**Files:**
- Create: `scripts/migrate-to-teable.ts`

**Interfaces:**
- Consumes: `src/lib/db.ts` (`sql`, still present at this point — deleted only in Task 10), `src/lib/server/teable.ts` (`createRecord`, `link`), `src/lib/server/teable-schema.ts`
- Produces: populated `Firmen`, `Kontakte_Real`, `Interaktionen_Real`, `Aufgaben_Real`, `Prospects` tables; prints an id-mapping JSON file used for spot-checking

- [ ] **Step 1: Write the migration script**

```ts
// scripts/migrate-to-teable.ts
// One-time migration. Run once against production Postgres, verify counts,
// then Postgres is decommissioned in Task 10. Idempotency NOT handled —
// do not run twice without truncating the Teable tables first.
import { sql } from '../src/lib/db.ts';
import { createRecord, link } from '../src/lib/server/teable.ts';
import {
  TABLES,
  FIRMEN_FIELDS,
  KONTAKTE_FIELDS,
  INTERAKTIONEN_FIELDS,
  AUFGABEN_FIELDS,
  PROSPECT_FIELDS
} from '../src/lib/server/teable-schema.ts';
import { writeFileSync } from 'node:fs';

async function main() {
  const companyIdMap = new Map<string, string>(); // pg uuid -> teable rec id
  const contactIdMap = new Map<string, string>();

  console.log('Migrating companies -> Firmen...');
  const companies = await sql`SELECT * FROM companies`;
  for (const c of companies) {
    const rec = await createRecord(TABLES.firmen, {
      [FIRMEN_FIELDS.name]: c.name,
      [FIRMEN_FIELDS.website]: c.website,
      [FIRMEN_FIELDS.strasse]: c.strasse,
      [FIRMEN_FIELDS.plz]: c.plz,
      [FIRMEN_FIELDS.ort]: c.ort,
      [FIRMEN_FIELDS.land]: c.land,
      [FIRMEN_FIELDS.notizen]: c.notizen
    });
    companyIdMap.set(c.id, rec.id);
  }
  console.log(`  ${companies.length} Firmen migrated.`);

  console.log('Migrating contacts (non-prospect-tagged) -> Kontakte_Real...');
  const contacts = await sql`SELECT * FROM contacts WHERE NOT ('prospect' = ANY(COALESCE(tags, '{}'::text[])))`;
  for (const c of contacts) {
    const rec = await createRecord(TABLES.kontakteReal, {
      [KONTAKTE_FIELDS.firma]: link(c.company_id ? companyIdMap.get(c.company_id) : null),
      [KONTAKTE_FIELDS.name]: c.name,
      [KONTAKTE_FIELDS.vorname]: c.vorname,
      [KONTAKTE_FIELDS.nachname]: c.nachname,
      [KONTAKTE_FIELDS.titel]: c.titel,
      [KONTAKTE_FIELDS.anrede]: c.anrede,
      [KONTAKTE_FIELDS.strasse]: c.strasse,
      [KONTAKTE_FIELDS.plz]: c.plz,
      [KONTAKTE_FIELDS.ort]: c.ort,
      [KONTAKTE_FIELDS.geburtstag]: c.geburtstag,
      [KONTAKTE_FIELDS.email]: c.email,
      [KONTAKTE_FIELDS.telefon]: c.telefon,
      [KONTAKTE_FIELDS.telefon2]: c.telefon2,
      [KONTAKTE_FIELDS.whatsapp]: c.whatsapp,
      [KONTAKTE_FIELDS.wechatId]: c.wechat_id,
      [KONTAKTE_FIELDS.linkedinUrl]: c.linkedin_url,
      [KONTAKTE_FIELDS.rolle]: c.rolle,
      [KONTAKTE_FIELDS.notizen]: c.notizen,
      [KONTAKTE_FIELDS.tags]: c.tags ?? [],
      [KONTAKTE_FIELDS.iban]: c.iban
      // Foto/Dateien intentionally NOT migrated here — base64 blobs need the
      // uploadAttachment endpoint (multipart), not a plain field write. Handle
      // separately in Step 2 below, only for contacts that actually have a photo/file.
    });
    contactIdMap.set(c.id, rec.id);
  }
  console.log(`  ${contacts.length} Kontakte_Real migrated.`);

  console.log('Migrating photos + files for migrated contacts...');
  const { uploadAttachment } = await import('../src/lib/server/teable.ts');
  const withPhoto = await sql`SELECT id, photo FROM contacts WHERE photo IS NOT NULL AND NOT ('prospect' = ANY(COALESCE(tags, '{}'::text[])))`;
  for (const row of withPhoto) {
    const teableId = contactIdMap.get(row.id);
    if (!teableId) continue;
    const [, mime, b64] = row.photo.match(/^data:(.+);base64,(.+)$/) ?? [];
    if (!b64) continue;
    const buf = Buffer.from(b64, 'base64');
    const file = new File([buf], 'foto.jpg', { type: mime || 'image/jpeg' });
    await uploadAttachment(TABLES.kontakteReal, teableId, KONTAKTE_FIELDS.foto, file);
  }
  const files = await sql`SELECT contact_id, filename, mimetype, data FROM contact_files`;
  for (const f of files) {
    const teableId = contactIdMap.get(f.contact_id);
    if (!teableId) continue;
    const [, , b64] = f.data.match(/^data:(.+);base64,(.+)$/) ?? [];
    if (!b64) continue;
    const buf = Buffer.from(b64, 'base64');
    const file = new File([buf], f.filename, { type: f.mimetype });
    await uploadAttachment(TABLES.kontakteReal, teableId, KONTAKTE_FIELDS.dateien, file);
  }
  console.log(`  ${withPhoto.length} Fotos, ${files.length} Dateien migrated.`);

  console.log('Migrating interactions + emails -> Interaktionen_Real...');
  const interactions = await sql`SELECT * FROM interactions`;
  for (const i of interactions) {
    const teableId = contactIdMap.get(i.contact_id);
    if (!teableId) continue;
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: link(teableId),
      [INTERAKTIONEN_FIELDS.typ]: i.typ,
      [INTERAKTIONEN_FIELDS.datum]: i.datum,
      [INTERAKTIONEN_FIELDS.titel]: i.zusammenfassung,
      [INTERAKTIONEN_FIELDS.text]: i.text
    });
  }
  const emails = await sql`SELECT * FROM emails WHERE contact_id IS NOT NULL`;
  for (const e of emails) {
    const teableId = contactIdMap.get(e.contact_id);
    if (!teableId) continue;
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: link(teableId),
      [INTERAKTIONEN_FIELDS.typ]: e.richtung === 'rein' ? 'email_rein' : 'email_raus',
      [INTERAKTIONEN_FIELDS.datum]: e.datum,
      [INTERAKTIONEN_FIELDS.titel]: e.betreff,
      [INTERAKTIONEN_FIELDS.text]: e.body_text,
      [INTERAKTIONEN_FIELDS.von]: e.von,
      [INTERAKTIONEN_FIELDS.an]: e.an
    });
  }
  console.log(`  ${interactions.length} Interaktionen + ${emails.length} Emails migrated.`);

  console.log('Migrating actions -> Aufgaben_Real...');
  const actions = await sql`SELECT * FROM actions`;
  for (const a of actions) {
    await createRecord(TABLES.aufgabenReal, {
      [AUFGABEN_FIELDS.kontakt]: link(a.contact_id ? contactIdMap.get(a.contact_id) : null),
      [AUFGABEN_FIELDS.titel]: a.titel,
      [AUFGABEN_FIELDS.status]: a.status,
      [AUFGABEN_FIELDS.faelligAm]: a.faellig_am,
      [AUFGABEN_FIELDS.notizen]: a.notizen
    });
  }
  console.log(`  ${actions.length} Aufgaben migrated.`);

  console.log('Migrating prospects (table) + prospect-tagged contacts -> Prospects...');
  const oldProspects = await sql`SELECT * FROM prospects`;
  for (const p of oldProspects) {
    await createRecord(TABLES.prospects, {
      [PROSPECT_FIELDS.name]: p.name,
      [PROSPECT_FIELDS.vorname]: p.vorname,
      [PROSPECT_FIELDS.nachname]: p.nachname,
      [PROSPECT_FIELDS.titel]: p.titel,
      [PROSPECT_FIELDS.anrede]: p.anrede,
      [PROSPECT_FIELDS.email]: p.email,
      [PROSPECT_FIELDS.firmaText]: p.firma,
      [PROSPECT_FIELDS.firma]: link(p.company_id ? companyIdMap.get(p.company_id) : null),
      [PROSPECT_FIELDS.rolle]: p.rolle,
      [PROSPECT_FIELDS.telefon]: p.telefon,
      [PROSPECT_FIELDS.website]: p.website,
      [PROSPECT_FIELDS.notizen]: p.notizen,
      [PROSPECT_FIELDS.status]: p.status,
      [PROSPECT_FIELDS.kanal]: p.kanal,
      [PROSPECT_FIELDS.versandtAm]: p.versandt_am,
      [PROSPECT_FIELDS.followupAm]: p.followup_am,
      [PROSPECT_FIELDS.sperre]: p.sperre,
      [PROSPECT_FIELDS.sperreGrund]: p.sperre_grund,
      [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
    });
  }
  const prospectTaggedContacts = await sql`SELECT * FROM contacts WHERE 'prospect' = ANY(COALESCE(tags, '{}'::text[]))`;
  for (const c of prospectTaggedContacts) {
    const extra = [c.strasse, c.plz, c.ort, c.geburtstag, c.iban]
      .filter(Boolean)
      .join(', ');
    await createRecord(TABLES.prospects, {
      [PROSPECT_FIELDS.name]: c.name,
      [PROSPECT_FIELDS.vorname]: c.vorname,
      [PROSPECT_FIELDS.nachname]: c.nachname,
      [PROSPECT_FIELDS.titel]: c.titel,
      [PROSPECT_FIELDS.anrede]: c.anrede,
      [PROSPECT_FIELDS.email]: c.email,
      [PROSPECT_FIELDS.firma]: link(c.company_id ? companyIdMap.get(c.company_id) : null),
      [PROSPECT_FIELDS.rolle]: c.rolle,
      [PROSPECT_FIELDS.telefon]: c.telefon,
      [PROSPECT_FIELDS.notizen]: extra ? `${c.notizen ?? ''}\n[migriert, Zusatzfelder: ${extra}]`.trim() : c.notizen,
      [PROSPECT_FIELDS.status]: 'gesendet',
      [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
    });
  }
  console.log(`  ${oldProspects.length} prospects + ${prospectTaggedContacts.length} tag-prospects migrated.`);

  writeFileSync(
    'migration-id-map.json',
    JSON.stringify({ companies: Object.fromEntries(companyIdMap), contacts: Object.fromEntries(contactIdMap) }, null, 2)
  );
  console.log('Done. id map written to migration-id-map.json for spot-checking.');
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Fill in real table IDs in `teable-schema.ts`**

Replace every `tbl_TODO_*` placeholder from Task 1's step 7 output before running.

- [ ] **Step 3: Dry-run count check before migrating**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && node --env-file=.env -e "
import('./src/lib/db.ts').then(async ({sql}) => {
  console.log('companies', (await sql\`SELECT COUNT(*) FROM companies\`)[0]);
  console.log('contacts (real)', (await sql\`SELECT COUNT(*) FROM contacts WHERE NOT (\\'prospect\\' = ANY(COALESCE(tags, \\'{}\\'::text[])))\`)[0]);
  console.log('contacts (prospect-tagged)', (await sql\`SELECT COUNT(*) FROM contacts WHERE \\'prospect\\' = ANY(COALESCE(tags, \\'{}\\'::text[]))\`)[0]);
  console.log('interactions', (await sql\`SELECT COUNT(*) FROM interactions\`)[0]);
  console.log('emails', (await sql\`SELECT COUNT(*) FROM emails\`)[0]);
  console.log('actions', (await sql\`SELECT COUNT(*) FROM actions\`)[0]);
  console.log('prospects', (await sql\`SELECT COUNT(*) FROM prospects\`)[0]);
  await sql.end();
})"`

Expected: prints real counts. Note them down — compared against Teable record counts after migration in Step 5.

- [ ] **Step 4: Run the migration**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && node --env-file=.env --experimental-strip-types scripts/migrate-to-teable.ts`

Expected: progress lines for each table, ends with "Done. id map written to migration-id-map.json".

- [ ] **Step 5: Verify counts match**

For each Teable table, open it in the UI (or `listRecords` via a quick script) and confirm the row count matches Step 3's Postgres counts (Kontakte_Real count = "contacts (real)"; Prospects count = "prospects" + "contacts (prospect-tagged)"). Spot-check 3 random contacts' fields against the Postgres source and against `migration-id-map.json`.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-to-teable.ts
git commit -m "feat: add one-time Postgres -> Teable migration script"
```

---

## Task 4: Rewrite Firmen (companies) routes

**Files:**
- Modify: `src/routes/companies/+page.server.ts`
- Modify: `src/routes/companies/[id]/+page.server.ts`
- Modify: `src/routes/api/v1/companies/+server.ts`
- Modify: `src/routes/api/v1/companies/[id]/+server.ts`

**Interfaces:**
- Consumes: `listRecords`, `getRecord`, `createRecord`, `updateRecord`, `deleteRecord` from `$lib/server/teable`, `TABLES`/`FIRMEN_FIELDS`/`KONTAKTE_FIELDS` from `$lib/server/teable-schema`

- [ ] **Step 1: Rewrite `src/routes/companies/+page.server.ts`**

```ts
import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [firmenRecs, kontakteRecs] = await Promise.all([
    listRecords(TABLES.firmen),
    listRecords(TABLES.kontakteReal)
  ]);

  // Mirror the original SQL: hide companies whose only linked contacts are
  // prospect-only (not applicable any more — prospects are a separate table
  // now, so every company with >=1 real contact, or 0 contacts, is shown).
  const contactCountByCompany = new Map<string, number>();
  for (const k of kontakteRecs) {
    const companyId = linkId(k.fields[KONTAKTE_FIELDS.firma]);
    if (companyId) contactCountByCompany.set(companyId, (contactCountByCompany.get(companyId) ?? 0) + 1);
  }

  const companies = firmenRecs
    .map((r) => ({
      id: r.id,
      name: r.fields[FIRMEN_FIELDS.name] as string,
      website: (r.fields[FIRMEN_FIELDS.website] as string) ?? null,
      strasse: (r.fields[FIRMEN_FIELDS.strasse] as string) ?? null,
      plz: (r.fields[FIRMEN_FIELDS.plz] as string) ?? null,
      ort: (r.fields[FIRMEN_FIELDS.ort] as string) ?? null,
      land: (r.fields[FIRMEN_FIELDS.land] as string) ?? null,
      notizen: (r.fields[FIRMEN_FIELDS.notizen] as string) ?? null,
      contact_count: contactCountByCompany.get(r.id) ?? 0
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'Name erforderlich' });
    await createRecord(TABLES.firmen, {
      [FIRMEN_FIELDS.name]: name,
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await updateRecord(TABLES.firmen, id, {
      [FIRMEN_FIELDS.name]: d.get('name'),
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.firmen, d.get('id') as string);
    return { success: true };
  }
};
```

- [ ] **Step 2: Rewrite `src/routes/companies/[id]/+page.server.ts`**

```ts
import { getRecord, listRecords, updateRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const company = await getRecord(TABLES.firmen, params.id);
  if (!company) throw error(404, 'Firma nicht gefunden');

  const allContacts = await listRecords(TABLES.kontakteReal);
  const contacts = allContacts
    .filter((c) => linkId(c.fields[KONTAKTE_FIELDS.firma]) === params.id)
    .map((c) => ({ id: c.id, name: c.fields[KONTAKTE_FIELDS.name], ...c.fields }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return {
    company: { id: company.id, ...company.fields },
    contacts
  };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const d = await request.formData();
    await updateRecord(TABLES.firmen, params.id, {
      [FIRMEN_FIELDS.name]: d.get('name'),
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  }
};
```

- [ ] **Step 3: Rewrite `src/routes/api/v1/companies/+server.ts`**

```ts
import { listRecords, createRecord } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = (url.searchParams.get('q') || '').toLowerCase();
  const all = await listRecords(TABLES.firmen);
  const filtered = q
    ? all.filter((c) => String(c.fields[FIRMEN_FIELDS.name] ?? '').toLowerCase().includes(q))
    : all;
  const companies = filtered
    .slice(0, q ? 50 : 200)
    .map((r) => ({ id: r.id, ...r.fields }))
    .sort((a, b) => String(a[FIRMEN_FIELDS.name]).localeCompare(String(b[FIRMEN_FIELDS.name])));

  return jsonOk({ companies });
};

export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const name = (body.name as string)?.trim();
  if (!name) return jsonError('name is required');

  const all = await listRecords(TABLES.firmen);
  const existing = all.find((c) => String(c.fields[FIRMEN_FIELDS.name] ?? '').toLowerCase() === name.toLowerCase());
  if (existing) return jsonOk({ company: { id: existing.id, ...existing.fields }, created: false });

  const rec = await createRecord(TABLES.firmen, {
    [FIRMEN_FIELDS.name]: name,
    [FIRMEN_FIELDS.website]: (body.website as string) || null,
    [FIRMEN_FIELDS.strasse]: (body.strasse as string) || null,
    [FIRMEN_FIELDS.plz]: (body.plz as string) || null,
    [FIRMEN_FIELDS.ort]: (body.ort as string) || null,
    [FIRMEN_FIELDS.land]: (body.land as string) || null,
    [FIRMEN_FIELDS.notizen]: (body.notizen as string) || null
  });

  return jsonOk({ company: { id: rec.id, ...rec.fields }, created: true }, 201);
};
```

- [ ] **Step 4: Rewrite `src/routes/api/v1/companies/[id]/+server.ts`**

```ts
import { getRecord, updateRecord, deleteRecord } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const company = await getRecord(TABLES.firmen, params.id);
  if (!company) return jsonError('Not found', 404);
  return jsonOk({ company: { id: company.id, ...company.fields } });
};

export const PATCH: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const existing = await getRecord(TABLES.firmen, params.id);
  if (!existing) return jsonError('Not found', 404);

  const merged = { ...existing.fields, ...body };
  await updateRecord(TABLES.firmen, params.id, {
    [FIRMEN_FIELDS.name]: (merged[FIRMEN_FIELDS.name] as string)?.trim ? (merged[FIRMEN_FIELDS.name] as string).trim() : existing.fields[FIRMEN_FIELDS.name],
    [FIRMEN_FIELDS.website]: merged[FIRMEN_FIELDS.website] || null,
    [FIRMEN_FIELDS.strasse]: merged[FIRMEN_FIELDS.strasse] || null,
    [FIRMEN_FIELDS.plz]: merged[FIRMEN_FIELDS.plz] || null,
    [FIRMEN_FIELDS.ort]: merged[FIRMEN_FIELDS.ort] || null,
    [FIRMEN_FIELDS.land]: merged[FIRMEN_FIELDS.land] || null,
    [FIRMEN_FIELDS.notizen]: merged[FIRMEN_FIELDS.notizen] || null
  });

  const updated = await getRecord(TABLES.firmen, params.id);
  return jsonOk({ company: { id: updated!.id, ...updated!.fields } });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const existing = await getRecord(TABLES.firmen, params.id);
  if (!existing) return jsonError('Not found', 404);

  await deleteRecord(TABLES.firmen, params.id);
  return jsonOk({ deleted: true });
};
```

- [ ] **Step 5: Manual verification**

Run: `./dev.sh` (or `npm run dev`), open `http://localhost:5173/companies`, create a test company, edit it, open its detail page, delete it. Confirm no console errors and the Teable `Firmen` table reflects each change live (check the Teable UI in parallel).

- [ ] **Step 6: Commit**

```bash
git add src/routes/companies src/routes/api/v1/companies
git commit -m "feat: migrate companies routes from Postgres to Teable"
```

---

## Task 5: Rewrite Kontakte_Real core routes

**Files:**
- Modify: `src/routes/contacts/+page.server.ts`
- Modify: `src/routes/contacts/[id]/+page.server.ts`
- Modify: `src/routes/contacts/+server.ts`
- Modify: `src/routes/contacts/[id]/vcard/+server.ts`
- Modify: `src/routes/api/contacts/search/+server.ts`

**Interfaces:**
- Consumes: everything from Task 2's client + schema constants
- Produces: contact list/detail/search/vcard behavior matching the original SQL 1:1 (minus the now-obsolete prospect-tag exclusion, since prospects live in their own table)

- [ ] **Step 1: Rewrite `src/routes/contacts/+page.server.ts`**

```ts
import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import type { Actions, PageServerLoad } from './$types';

function matchesFilters(
  fields: Record<string, unknown>,
  { q, tag, kanal }: { q: string; tag: string; kanal: string }
): boolean {
  if (q) {
    const hay = `${fields[KONTAKTE_FIELDS.name] ?? ''} ${fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  if (tag) {
    const tags = (fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
    if (!tags.includes(tag)) return false;
  }
  if (kanal === 'whatsapp' && !fields[KONTAKTE_FIELDS.whatsapp]) return false;
  if (kanal === 'wechat' && !fields[KONTAKTE_FIELDS.wechatId]) return false;
  return true;
}

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const kanal = url.searchParams.get('kanal') || '';

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const contacts = kontakteRecs
    .filter((r) => matchesFilters(r.fields, { q, tag, kanal }))
    .map((r) => ({
      id: r.id,
      ...r.fields,
      company_name: firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null
    }))
    .sort((a, b) => String(a[KONTAKTE_FIELDS.name]).localeCompare(String(b[KONTAKTE_FIELDS.name])));

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();

  return { contacts, companies, q, tag, kanal, allTags };
};

function parseTags(d: FormData): string[] {
  const raw = (d.get('tags') as string) || '';
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

function extractContactFields(d: FormData) {
  const name = (d.get('name') as string)?.trim() || 'Unbekannt';
  return {
    [KONTAKTE_FIELDS.name]: name,
    [KONTAKTE_FIELDS.vorname]: d.get('vorname') || null,
    [KONTAKTE_FIELDS.nachname]: d.get('nachname') || null,
    [KONTAKTE_FIELDS.titel]: d.get('titel') || null,
    [KONTAKTE_FIELDS.anrede]: d.get('anrede') || null,
    [KONTAKTE_FIELDS.strasse]: d.get('strasse') || null,
    [KONTAKTE_FIELDS.plz]: d.get('plz') || null,
    [KONTAKTE_FIELDS.ort]: d.get('ort') || null,
    [KONTAKTE_FIELDS.geburtstag]: d.get('geburtstag') || null,
    [KONTAKTE_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
    [KONTAKTE_FIELDS.rolle]: d.get('rolle') || null,
    [KONTAKTE_FIELDS.email]: d.get('email') || null,
    [KONTAKTE_FIELDS.telefon]: d.get('telefon') || null,
    [KONTAKTE_FIELDS.telefon2]: d.get('telefon2') || null,
    [KONTAKTE_FIELDS.whatsapp]: d.get('whatsapp') || null,
    [KONTAKTE_FIELDS.wechatId]: d.get('wechat_id') || null,
    [KONTAKTE_FIELDS.linkedinUrl]: d.get('linkedin_url') || null,
    [KONTAKTE_FIELDS.notizen]: d.get('notizen') || null,
    [KONTAKTE_FIELDS.iban]: d.get('iban') || null,
    [KONTAKTE_FIELDS.tags]: parseTags(d)
  };
}

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const rec = await createRecord(TABLES.kontakteReal, extractContactFields(d));
    return { success: true, id: rec.id };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await updateRecord(TABLES.kontakteReal, id, extractContactFields(d));
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.kontakteReal, d.get('id') as string);
    return { success: true };
  }
};
```

- [ ] **Step 2: Rewrite `src/routes/contacts/[id]/+page.server.ts`**

```ts
import {
  getRecord,
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  linkId
} from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS, AUFGABEN_FIELDS } from '$lib/server/teable-schema';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id);
  if (!contact) throw error(404, 'Kontakt nicht gefunden');

  const [firma, allInteractions, allActions, firmenRecs] = await Promise.all([
    linkId(contact.fields[KONTAKTE_FIELDS.firma])
      ? getRecord(TABLES.firmen, linkId(contact.fields[KONTAKTE_FIELDS.firma])!)
      : Promise.resolve(null),
    listRecords(TABLES.interaktionenReal),
    listRecords(TABLES.aufgabenReal),
    listRecords(TABLES.firmen)
  ]);

  // Replaces the contact_timeline VIEW: Interaktionen_Real already merges
  // interactions+emails, so this is just a filter+sort, no UNION needed.
  const timeline = allInteractions
    .filter((r) => linkId(r.fields[INTERAKTIONEN_FIELDS.kontakt]) === params.id)
    .map((r) => ({ id: r.id, ...r.fields }))
    .sort((a, b) => String(b[INTERAKTIONEN_FIELDS.datum]).localeCompare(String(a[INTERAKTIONEN_FIELDS.datum])));

  const actions_list = allActions
    .filter((r) => linkId(r.fields[AUFGABEN_FIELDS.kontakt]) === params.id)
    .map((r) => ({ id: r.id, ...r.fields }))
    .sort((a, b) => {
      const af = a[AUFGABEN_FIELDS.faelligAm] as string | null;
      const bf = b[AUFGABEN_FIELDS.faelligAm] as string | null;
      if (!af) return 1;
      if (!bf) return -1;
      return af.localeCompare(bf);
    });

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return {
    contact: { id: contact.id, ...contact.fields, company_name: firma?.fields[FIRMEN_FIELDS.name] ?? null },
    timeline,
    actions_list,
    companies
  };
};

export const actions: Actions = {
  add_interaction: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: [{ id: params.id }],
      [INTERAKTIONEN_FIELDS.typ]: d.get('typ'),
      [INTERAKTIONEN_FIELDS.datum]: d.get('datum') || new Date().toISOString(),
      [INTERAKTIONEN_FIELDS.titel]: d.get('zusammenfassung') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('text') || null
    });
    return { success: true };
  },
  add_email: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: [{ id: params.id }],
      [INTERAKTIONEN_FIELDS.typ]: d.get('richtung') === 'rein' ? 'email_rein' : 'email_raus',
      [INTERAKTIONEN_FIELDS.von]: d.get('von') || null,
      [INTERAKTIONEN_FIELDS.an]: d.get('an') || null,
      [INTERAKTIONEN_FIELDS.titel]: d.get('betreff') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('body_text') || null,
      [INTERAKTIONEN_FIELDS.datum]: d.get('datum') || new Date().toISOString()
    });
    return { success: true };
  },
  add_action: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.aufgabenReal, {
      [AUFGABEN_FIELDS.kontakt]: [{ id: params.id }],
      [AUFGABEN_FIELDS.titel]: d.get('titel'),
      [AUFGABEN_FIELDS.faelligAm]: d.get('faellig_am') || null,
      [AUFGABEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  toggle_action: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const existing = await getRecord(TABLES.aufgabenReal, id);
    const current = existing?.fields[AUFGABEN_FIELDS.status];
    await updateRecord(TABLES.aufgabenReal, id, {
      [AUFGABEN_FIELDS.status]: current === 'offen' ? 'erledigt' : 'offen'
    });
    return { success: true };
  },
  update_action: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await updateRecord(TABLES.aufgabenReal, id, {
      [AUFGABEN_FIELDS.titel]: d.get('titel') || null,
      [AUFGABEN_FIELDS.faelligAm]: d.get('faellig_am') || null,
      [AUFGABEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  delete_action: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.aufgabenReal, d.get('id') as string);
    return { success: true };
  },
  delete_interaction: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.interaktionenReal, d.get('id') as string);
    return { success: true };
  },
  update_interaction: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.interaktionenReal, d.get('id') as string, {
      [INTERAKTIONEN_FIELDS.titel]: d.get('zusammenfassung') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('text') || null
    });
    return { success: true };
  },
  delete_email: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.interaktionenReal, d.get('id') as string);
    return { success: true };
  },
  update_email: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.interaktionenReal, d.get('id') as string, {
      [INTERAKTIONEN_FIELDS.titel]: d.get('betreff') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('body_text') || null
    });
    return { success: true };
  },
  update_contact: async ({ request, params }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim() || 'Unbekannt';
    const rawTags = (d.get('tags') as string) || '';
    const tags = rawTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    await updateRecord(TABLES.kontakteReal, params.id, {
      [KONTAKTE_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
      [KONTAKTE_FIELDS.name]: name,
      [KONTAKTE_FIELDS.vorname]: d.get('vorname') || null,
      [KONTAKTE_FIELDS.nachname]: d.get('nachname') || null,
      [KONTAKTE_FIELDS.titel]: d.get('titel') || null,
      [KONTAKTE_FIELDS.anrede]: d.get('anrede') || null,
      [KONTAKTE_FIELDS.strasse]: d.get('strasse') || null,
      [KONTAKTE_FIELDS.plz]: d.get('plz') || null,
      [KONTAKTE_FIELDS.ort]: d.get('ort') || null,
      [KONTAKTE_FIELDS.geburtstag]: d.get('geburtstag') || null,
      [KONTAKTE_FIELDS.email]: d.get('email') || null,
      [KONTAKTE_FIELDS.telefon]: d.get('telefon') || null,
      [KONTAKTE_FIELDS.telefon2]: d.get('telefon2') || null,
      [KONTAKTE_FIELDS.whatsapp]: d.get('whatsapp') || null,
      [KONTAKTE_FIELDS.wechatId]: d.get('wechat_id') || null,
      [KONTAKTE_FIELDS.linkedinUrl]: d.get('linkedin_url') || null,
      [KONTAKTE_FIELDS.rolle]: d.get('rolle') || null,
      [KONTAKTE_FIELDS.notizen]: d.get('notizen') || null,
      [KONTAKTE_FIELDS.iban]: d.get('iban') || null,
      [KONTAKTE_FIELDS.tags]: tags
    });
    return { success: true };
  }
};
```

- [ ] **Step 3: Rewrite `src/routes/contacts/+server.ts`**

```ts
import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const tag = url.searchParams.get('tag') || '';
  const kanal = url.searchParams.get('kanal') || '';

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name]]));

  let filtered = kontakteRecs;
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''} ${r.fields[KONTAKTE_FIELDS.vorname] ?? ''} ${r.fields[KONTAKTE_FIELDS.nachname] ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (tag) filtered = filtered.filter((r) => ((r.fields[KONTAKTE_FIELDS.tags] as string[]) ?? []).includes(tag));
  if (kanal === 'whatsapp') filtered = filtered.filter((r) => r.fields[KONTAKTE_FIELDS.whatsapp]);
  if (kanal === 'wechat') filtered = filtered.filter((r) => r.fields[KONTAKTE_FIELDS.wechatId]);
  if (!q && !tag && !kanal) filtered = [];

  const limit = q ? 50 : 100;
  const contacts = filtered
    .slice(0, limit)
    .map((r) => ({ id: r.id, ...r.fields, company_name: firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null }))
    .sort((a, b) => String(a[KONTAKTE_FIELDS.name]).localeCompare(String(b[KONTAKTE_FIELDS.name])));

  return json({ contacts });
};
```

- [ ] **Step 4: Rewrite `src/routes/contacts/[id]/vcard/+server.ts`**

```ts
import { error } from '@sveltejs/kit';
import { getRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

const esc = (s?: string | null) =>
  (s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export const GET: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id);
  if (!contact) throw error(404, 'Kontakt nicht gefunden');

  const firmaId = linkId(contact.fields[KONTAKTE_FIELDS.firma]);
  const firma = firmaId ? await getRecord(TABLES.firmen, firmaId) : null;

  const c = contact.fields;
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(c[KONTAKTE_FIELDS.name] as string)}`,
    `N:${esc(c[KONTAKTE_FIELDS.name] as string)};;;;`,
    firma ? `ORG:${esc(firma.fields[FIRMEN_FIELDS.name] as string)}` : '',
    c[KONTAKTE_FIELDS.rolle] ? `TITLE:${esc(c[KONTAKTE_FIELDS.rolle] as string)}` : '',
    c[KONTAKTE_FIELDS.email] ? `EMAIL;TYPE=INTERNET:${esc(c[KONTAKTE_FIELDS.email] as string)}` : '',
    c[KONTAKTE_FIELDS.telefon] ? `TEL;TYPE=CELL:${esc(c[KONTAKTE_FIELDS.telefon] as string)}` : '',
    c[KONTAKTE_FIELDS.whatsapp] ? `TEL;TYPE=CELL;TYPE=WHATSAPP:${esc(c[KONTAKTE_FIELDS.whatsapp] as string)}` : '',
    c[KONTAKTE_FIELDS.linkedinUrl] ? `URL;TYPE=LinkedIn:${esc(c[KONTAKTE_FIELDS.linkedinUrl] as string)}` : '',
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\r\n');

  const fn = String(c[KONTAKTE_FIELDS.name] ?? 'kontakt').replace(/[^a-z0-9]+/gi, '_');
  return new Response(vcard, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fn}.vcf"`
    }
  });
};
```

- [ ] **Step 5: Rewrite `src/routes/api/contacts/search/+server.ts`**

```ts
import { listRecords } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  if (!q.trim()) return json({ contacts: [] });

  const all = await listRecords(TABLES.kontakteReal);
  const needle = q.toLowerCase();
  const contacts = all
    .filter((r) => {
      const hay = `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      name: r.fields[KONTAKTE_FIELDS.name],
      email: r.fields[KONTAKTE_FIELDS.email],
      rolle: r.fields[KONTAKTE_FIELDS.rolle]
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return json({ contacts });
};
```

- [ ] **Step 6: Manual verification**

`./dev.sh`, then: open `/contacts`, search + filter by tag/kanal, open a contact detail page, add an interaction/email/action, toggle+edit+delete each, download vCard, hit `/api/contacts/search?q=...` with curl.

- [ ] **Step 7: Commit**

```bash
git add src/routes/contacts src/routes/api/contacts/search
git commit -m "feat: migrate contacts core routes from Postgres to Teable"
```

---

## Task 6: Photo + Files → Attachment fields

**Files:**
- Modify: `src/routes/api/contacts/[id]/photo/+server.ts`
- Modify: `src/routes/api/contacts/[id]/files/+server.ts`
- Modify: `src/routes/api/contacts/[id]/files/[fid]/+server.ts`

**Interfaces:**
- Consumes: `uploadAttachment`, `getRecord`, `updateRecord` from `$lib/server/teable`

- [ ] **Step 1: Rewrite `src/routes/api/contacts/[id]/photo/+server.ts`**

```ts
import { json, error } from '@sveltejs/kit';
import { uploadAttachment, updateRecord, getRecord } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  const { id } = params;
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  if (!file) throw error(400, 'Kein Bild');

  await uploadAttachment(TABLES.kontakteReal, id!, KONTAKTE_FIELDS.foto, file);
  const updated = await getRecord(TABLES.kontakteReal, id!);
  return json({ photo: updated?.fields[KONTAKTE_FIELDS.foto] ?? null });
};

export const DELETE: RequestHandler = async ({ params }) => {
  await updateRecord(TABLES.kontakteReal, params.id!, { [KONTAKTE_FIELDS.foto]: null });
  return json({ ok: true });
};
```

- [ ] **Step 2: Rewrite `src/routes/api/contacts/[id]/files/+server.ts`**

```ts
import { json, error } from '@sveltejs/kit';
import { getRecord, uploadAttachment } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  const files = (contact?.fields[KONTAKTE_FIELDS.dateien] as Array<Record<string, unknown>> | undefined) ?? [];
  return json({ files });
};

export const POST: RequestHandler = async ({ request, params }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw error(400, 'Keine Datei');

  await uploadAttachment(TABLES.kontakteReal, params.id!, KONTAKTE_FIELDS.dateien, file);
  const updated = await getRecord(TABLES.kontakteReal, params.id!);
  const files = (updated?.fields[KONTAKTE_FIELDS.dateien] as Array<Record<string, unknown>> | undefined) ?? [];
  return json({ file: files[files.length - 1] });
};
```

Note: Teable's Attachment field holds an array of `{id, name, mimetype, url, ...}` objects natively (per `uploadAttachment` API research) — this replaces the whole `contact_files` table. The Svelte component consuming `files` (`src/lib/components/*` — not touched in this plan, verify its field expectations during Step 4 below and adjust prop names if it expects the old `{id, filename, mimetype, data}` shape).

- [ ] **Step 3: Rewrite `src/routes/api/contacts/[id]/files/[fid]/+server.ts`**

```ts
import { json, error } from '@sveltejs/kit';
import { getRecord, updateRecord } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  const files = (contact?.fields[KONTAKTE_FIELDS.dateien] as Array<{ id: string }> | undefined) ?? [];
  const remaining = files.filter((f) => f.id !== params.fid);
  if (remaining.length === files.length) throw error(404, 'Nicht gefunden');

  // Teable attachment fields are replaced wholesale on write, not appended-to
  // for removal — write back the filtered array.
  await updateRecord(TABLES.kontakteReal, params.id!, { [KONTAKTE_FIELDS.dateien]: remaining });
  return json({ ok: true });
};

export const GET: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  const files = (contact?.fields[KONTAKTE_FIELDS.dateien] as Array<{ id: string; url: string; name: string; mimetype: string }> | undefined) ?? [];
  const file = files.find((f) => f.id === params.fid);
  if (!file) throw error(404, 'Nicht gefunden');

  // Teable serves attachments from its own URL — redirect instead of proxying
  // bytes (the old base64-in-Postgres approach proxied bytes because that was
  // the only option; Teable already hosts the file).
  return new Response(null, { status: 302, headers: { Location: file.url } });
};
```

- [ ] **Step 4: Check `src/lib/components/*` for the old `{id, filename, mimetype, data}` file shape**

Run: `grep -rn "filename\|mimetype" src/lib/components/` and update any component that destructures the old Postgres shape to use Teable's attachment object shape (`name` instead of `filename`, `url` instead of a base64 `data` field for direct linking/downloading, `mimetype` unchanged). Also check `ContactForm.svelte`'s photo-display logic (currently expects a base64 data-URL string — now expects `{url, ...}` object or array).

- [ ] **Step 5: Manual verification**

`./dev.sh`, open a contact, upload a photo, remove it, upload 2 files to the Dateien tab, download one, delete one. Confirm the Teable `Kontakte_Real` record's `Foto`/`Dateien` fields update live in the Teable UI.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/contacts/[id]/photo src/routes/api/contacts/[id]/files src/lib/components
git commit -m "feat: migrate photo/file storage to Teable attachment fields"
```

---

## Task 7: Rewrite external REST API v1 (contacts)

**Files:**
- Modify: `src/routes/api/v1/contacts/+server.ts`
- Modify: `src/routes/api/v1/contacts/[id]/+server.ts`

**Interfaces:**
- Consumes: Task 2's client. **Note:** this API is what pushes Prospects over from the mass-outreach Teable base in Task 12 — its `tags`/`exclude_tag` query params existed specifically so Henry could pull "prospect"-tagged contacts. With Prospects now a dedicated table (Task 8), Henry's future automation should call the `Prospects` table's API directly instead of this endpoint with a `prospect` tag — this endpoint reverts to a plain contacts API with no tag-based prospect semantics.

- [ ] **Step 1: Rewrite `src/routes/api/v1/contacts/+server.ts`**

```ts
import { listRecords, createRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// GET /api/v1/contacts?q=...&tag=...&limit=50
export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = (url.searchParams.get('q') || '').toLowerCase();
  const tag = url.searchParams.get('tag') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name]]));

  let filtered = kontakteRecs;
  if (q) {
    filtered = filtered.filter((r) => `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase().includes(q));
  }
  if (tag) {
    filtered = filtered.filter((r) => ((r.fields[KONTAKTE_FIELDS.tags] as string[]) ?? []).includes(tag));
  }

  const contacts = filtered
    .slice(0, limit)
    .map((r) => ({ id: r.id, ...r.fields, company_name: firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null }))
    .sort((a, b) => String(a[KONTAKTE_FIELDS.name]).localeCompare(String(b[KONTAKTE_FIELDS.name])));

  return jsonOk({ contacts });
};

// POST /api/v1/contacts
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const name = (body.name as string)?.trim() || [body.vorname, body.nachname].filter(Boolean).join(' ') || 'Unbekannt';
  const tags = Array.isArray(body.tags)
    ? (body.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean)
    : typeof body.tags === 'string'
      ? (body.tags as string).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

  const rec = await createRecord(TABLES.kontakteReal, {
    [KONTAKTE_FIELDS.firma]: body.company_id ? [{ id: body.company_id as string }] : null,
    [KONTAKTE_FIELDS.name]: name,
    [KONTAKTE_FIELDS.vorname]: (body.vorname as string) || null,
    [KONTAKTE_FIELDS.nachname]: (body.nachname as string) || null,
    [KONTAKTE_FIELDS.titel]: (body.titel as string) || null,
    [KONTAKTE_FIELDS.anrede]: (body.anrede as string) || null,
    [KONTAKTE_FIELDS.strasse]: (body.strasse as string) || null,
    [KONTAKTE_FIELDS.plz]: (body.plz as string) || null,
    [KONTAKTE_FIELDS.ort]: (body.ort as string) || null,
    [KONTAKTE_FIELDS.geburtstag]: (body.geburtstag as string) || null,
    [KONTAKTE_FIELDS.email]: (body.email as string) || null,
    [KONTAKTE_FIELDS.telefon]: (body.telefon as string) || null,
    [KONTAKTE_FIELDS.telefon2]: (body.telefon2 as string) || null,
    [KONTAKTE_FIELDS.whatsapp]: (body.whatsapp as string) || null,
    [KONTAKTE_FIELDS.wechatId]: (body.wechat_id as string) || null,
    [KONTAKTE_FIELDS.linkedinUrl]: (body.linkedin_url as string) || null,
    [KONTAKTE_FIELDS.rolle]: (body.rolle as string) || null,
    [KONTAKTE_FIELDS.notizen]: (body.notizen as string) || null,
    [KONTAKTE_FIELDS.iban]: (body.iban as string) || null,
    [KONTAKTE_FIELDS.tags]: tags
  });

  return jsonOk({ contact: { id: rec.id, ...rec.fields } }, 201);
};
```

- [ ] **Step 2: Rewrite `src/routes/api/v1/contacts/[id]/+server.ts`**

```ts
import { getRecord, updateRecord, deleteRecord } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  if (!contact) return jsonError('Not found', 404);
  return jsonOk({ contact: { id: contact.id, ...contact.fields } });
};

export const PATCH: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const existing = await getRecord(TABLES.kontakteReal, params.id!);
  if (!existing) return jsonError('Not found', 404);

  const tags =
    body.tags !== undefined
      ? Array.isArray(body.tags)
        ? (body.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean)
        : typeof body.tags === 'string'
          ? (body.tags as string).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
          : existing.fields[KONTAKTE_FIELDS.tags]
      : existing.fields[KONTAKTE_FIELDS.tags];

  const merged = { ...existing.fields, ...body, [KONTAKTE_FIELDS.tags]: tags };

  await updateRecord(TABLES.kontakteReal, params.id!, {
    [KONTAKTE_FIELDS.firma]: merged.company_id ? [{ id: merged.company_id as string }] : existing.fields[KONTAKTE_FIELDS.firma],
    [KONTAKTE_FIELDS.name]: merged[KONTAKTE_FIELDS.name] || 'Unbekannt',
    [KONTAKTE_FIELDS.vorname]: merged[KONTAKTE_FIELDS.vorname] || null,
    [KONTAKTE_FIELDS.nachname]: merged[KONTAKTE_FIELDS.nachname] || null,
    [KONTAKTE_FIELDS.titel]: merged[KONTAKTE_FIELDS.titel] || null,
    [KONTAKTE_FIELDS.anrede]: merged[KONTAKTE_FIELDS.anrede] || null,
    [KONTAKTE_FIELDS.strasse]: merged[KONTAKTE_FIELDS.strasse] || null,
    [KONTAKTE_FIELDS.plz]: merged[KONTAKTE_FIELDS.plz] || null,
    [KONTAKTE_FIELDS.ort]: merged[KONTAKTE_FIELDS.ort] || null,
    [KONTAKTE_FIELDS.geburtstag]: merged[KONTAKTE_FIELDS.geburtstag] || null,
    [KONTAKTE_FIELDS.email]: merged[KONTAKTE_FIELDS.email] || null,
    [KONTAKTE_FIELDS.telefon]: merged[KONTAKTE_FIELDS.telefon] || null,
    [KONTAKTE_FIELDS.telefon2]: merged[KONTAKTE_FIELDS.telefon2] || null,
    [KONTAKTE_FIELDS.whatsapp]: merged[KONTAKTE_FIELDS.whatsapp] || null,
    [KONTAKTE_FIELDS.wechatId]: merged[KONTAKTE_FIELDS.wechatId] || null,
    [KONTAKTE_FIELDS.linkedinUrl]: merged[KONTAKTE_FIELDS.linkedinUrl] || null,
    [KONTAKTE_FIELDS.rolle]: merged[KONTAKTE_FIELDS.rolle] || null,
    [KONTAKTE_FIELDS.notizen]: merged[KONTAKTE_FIELDS.notizen] || null,
    [KONTAKTE_FIELDS.iban]: merged[KONTAKTE_FIELDS.iban] || null,
    [KONTAKTE_FIELDS.tags]: tags
  });

  const updated = await getRecord(TABLES.kontakteReal, params.id!);
  return jsonOk({ contact: { id: updated!.id, ...updated!.fields } });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const existing = await getRecord(TABLES.kontakteReal, params.id!);
  if (!existing) return jsonError('Not found', 404);

  await deleteRecord(TABLES.kontakteReal, params.id!);
  return jsonOk({ deleted: true });
};
```

- [ ] **Step 3: Manual verification**

`./dev.sh`, then `curl` each endpoint with the `CRM_API_KEY` bearer token (from Coolify env / `data/crm-api.json`): GET list with `?q=`/`?tag=`, POST a new contact, GET/PATCH/DELETE by id.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/v1/contacts
git commit -m "feat: migrate external REST API v1 contacts routes to Teable"
```

---

## Task 8: Unify Prospects (delete tag-based route, rewrite table-based route)

**Files:**
- Modify: `src/routes/prospects/+page.server.ts`
- Delete: `src/routes/prospects/contacts/+page.server.ts`, `src/routes/prospects/contacts/+page.svelte` (and the whole `src/routes/prospects/contacts/` directory)
- Modify: `src/routes/api/v1/prospects/+server.ts`

**Interfaces:**
- Consumes: Task 2's client + `PROSPECT_FIELDS`/`KONTAKTE_FIELDS`/`FIRMEN_FIELDS`

- [ ] **Step 1: Rewrite `src/routes/prospects/+page.server.ts`**

The `promote` action now creates a `Kontakte_Real` record and deletes the `Prospects` record — same behavior as before, just against Teable instead of Postgres, and there's no second prospect mechanism to reconcile with any more.

```ts
import { listRecords, createRecord, updateRecord, deleteRecord, getRecord, linkId } from '$lib/server/teable';
import { TABLES, PROSPECT_FIELDS, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').toLowerCase();

  const [prospectRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.prospects),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name]]));

  let filtered = prospectRecs;
  if (status) filtered = filtered.filter((r) => r.fields[PROSPECT_FIELDS.status] === status);
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = `${r.fields[PROSPECT_FIELDS.name] ?? ''} ${r.fields[PROSPECT_FIELDS.email] ?? ''} ${r.fields[PROSPECT_FIELDS.firmaText] ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const prospects = filtered
    .map((r) => ({
      id: r.id,
      ...r.fields,
      company_name: firmaNameById.get(linkId(r.fields[PROSPECT_FIELDS.firma]) ?? '') ?? null
    }))
    .sort((a, b) => {
      const av = (a[PROSPECT_FIELDS.versandtAm] as string) ?? '';
      const bv = (b[PROSPECT_FIELDS.versandtAm] as string) ?? '';
      if (av !== bv) return av ? (bv ? bv.localeCompare(av) : -1) : 1;
      return 0;
    });

  const counts: Record<string, number> = {};
  for (const r of prospectRecs) {
    const s = (r.fields[PROSPECT_FIELDS.status] as string) ?? 'unbekannt';
    counts[s] = (counts[s] ?? 0) + 1;
  }

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return { prospects, counts, total: prospectRecs.length, status, q, companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'Name fehlt' });
    await createRecord(TABLES.prospects, {
      [PROSPECT_FIELDS.name]: name,
      [PROSPECT_FIELDS.vorname]: d.get('vorname') || null,
      [PROSPECT_FIELDS.nachname]: d.get('nachname') || null,
      [PROSPECT_FIELDS.titel]: d.get('titel') || null,
      [PROSPECT_FIELDS.anrede]: d.get('anrede') || null,
      [PROSPECT_FIELDS.email]: d.get('email') || null,
      [PROSPECT_FIELDS.firmaText]: d.get('firma') || null,
      [PROSPECT_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
      [PROSPECT_FIELDS.rolle]: d.get('rolle') || null,
      [PROSPECT_FIELDS.telefon]: d.get('telefon') || null,
      [PROSPECT_FIELDS.website]: d.get('website') || null,
      [PROSPECT_FIELDS.notizen]: d.get('notizen') || null,
      [PROSPECT_FIELDS.status]: (d.get('status') as string) || 'gesendet',
      [PROSPECT_FIELDS.kanal]: d.get('kanal') || 'email',
      [PROSPECT_FIELDS.versandtAm]: d.get('versandt_am') || null,
      [PROSPECT_FIELDS.followupAm]: d.get('followup_am') || null,
      [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
    });
    return { success: true };
  },

  update_status: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.prospects, d.get('id') as string, {
      [PROSPECT_FIELDS.status]: d.get('status') as string
    });
    return { success: true };
  },

  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const name = (d.get('name') as string)?.trim() || 'Unbekannt';
    await updateRecord(TABLES.prospects, id, {
      [PROSPECT_FIELDS.name]: name,
      [PROSPECT_FIELDS.vorname]: d.get('vorname') || null,
      [PROSPECT_FIELDS.nachname]: d.get('nachname') || null,
      [PROSPECT_FIELDS.titel]: d.get('titel') || null,
      [PROSPECT_FIELDS.anrede]: d.get('anrede') || null,
      [PROSPECT_FIELDS.email]: d.get('email') || null,
      [PROSPECT_FIELDS.firmaText]: d.get('firma') || null,
      [PROSPECT_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
      [PROSPECT_FIELDS.rolle]: d.get('rolle') || null,
      [PROSPECT_FIELDS.telefon]: d.get('telefon') || null,
      [PROSPECT_FIELDS.website]: d.get('website') || null,
      [PROSPECT_FIELDS.notizen]: d.get('notizen') || null,
      [PROSPECT_FIELDS.status]: (d.get('status') as string) || 'gesendet',
      [PROSPECT_FIELDS.kanal]: d.get('kanal') || 'email',
      [PROSPECT_FIELDS.versandtAm]: d.get('versandt_am') || null,
      [PROSPECT_FIELDS.followupAm]: d.get('followup_am') || null
    });
    return { success: true };
  },

  promote: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const p = await getRecord(TABLES.prospects, id);
    if (!p) return fail(404, { error: 'Nicht gefunden' });

    let firmaId = linkId(p.fields[PROSPECT_FIELDS.firma]);
    const firmaText = p.fields[PROSPECT_FIELDS.firmaText] as string | null;
    if (!firmaId && firmaText) {
      const allFirmen = await listRecords(TABLES.firmen);
      const existing = allFirmen.find((f) => String(f.fields[FIRMEN_FIELDS.name] ?? '').toLowerCase() === firmaText.toLowerCase());
      firmaId = existing ? existing.id : (await createRecord(TABLES.firmen, { [FIRMEN_FIELDS.name]: firmaText, [FIRMEN_FIELDS.website]: p.fields[PROSPECT_FIELDS.website] ?? null })).id;
    }

    const created = await createRecord(TABLES.kontakteReal, {
      [KONTAKTE_FIELDS.name]: p.fields[PROSPECT_FIELDS.name],
      [KONTAKTE_FIELDS.vorname]: p.fields[PROSPECT_FIELDS.vorname],
      [KONTAKTE_FIELDS.nachname]: p.fields[PROSPECT_FIELDS.nachname],
      [KONTAKTE_FIELDS.titel]: p.fields[PROSPECT_FIELDS.titel],
      [KONTAKTE_FIELDS.anrede]: p.fields[PROSPECT_FIELDS.anrede],
      [KONTAKTE_FIELDS.email]: p.fields[PROSPECT_FIELDS.email],
      [KONTAKTE_FIELDS.firma]: firmaId ? [{ id: firmaId }] : null,
      [KONTAKTE_FIELDS.rolle]: p.fields[PROSPECT_FIELDS.rolle],
      [KONTAKTE_FIELDS.telefon]: p.fields[PROSPECT_FIELDS.telefon],
      [KONTAKTE_FIELDS.notizen]: p.fields[PROSPECT_FIELDS.notizen]
    });

    await deleteRecord(TABLES.prospects, id);
    return { success: true, contact_id: created.id };
  },

  delete: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.prospects, d.get('id') as string);
    return { success: true };
  },

  import_csv: async ({ request }) => {
    const d = await request.formData();
    const rows = JSON.parse(d.get('rows') as string) as Record<string, string>[];
    if (!rows?.length) return fail(400, { error: 'Keine Daten' });

    const existingAll = await listRecords(TABLES.prospects);
    const existingEmails = new Set(
      existingAll.map((r) => String(r.fields[PROSPECT_FIELDS.email] ?? '').toLowerCase()).filter(Boolean)
    );

    let count = 0;
    for (const row of rows) {
      const name = (row.name || [row.vorname, row.nachname].filter(Boolean).join(' ') || row.Name || '').trim();
      if (!name) continue;
      const email = (row.email || row.Email || row['E-Mail'] || '').toLowerCase();
      // Mirrors the old ON CONFLICT DO NOTHING behavior (best-effort dedupe by email).
      if (email && existingEmails.has(email)) continue;

      await createRecord(TABLES.prospects, {
        [PROSPECT_FIELDS.name]: name,
        [PROSPECT_FIELDS.vorname]: row.vorname || row.Vorname || null,
        [PROSPECT_FIELDS.nachname]: row.nachname || row.Nachname || null,
        [PROSPECT_FIELDS.titel]: row.titel || row.Titel || null,
        [PROSPECT_FIELDS.anrede]: row.anrede || row.Anrede || null,
        [PROSPECT_FIELDS.email]: row.email || row.Email || row['E-Mail'] || null,
        [PROSPECT_FIELDS.firmaText]: row.firma || row.Firma || row.kanzlei || row.Kanzlei || null,
        [PROSPECT_FIELDS.rolle]: row.rolle || row.Rolle || row.position || null,
        [PROSPECT_FIELDS.telefon]: row.telefon || row.Telefon || row.phone || null,
        [PROSPECT_FIELDS.website]: row.website || row.Website || null,
        [PROSPECT_FIELDS.status]: 'gesendet',
        [PROSPECT_FIELDS.versandtAm]: row.versandt_am || row.datum || null,
        [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
      });
      if (email) existingEmails.add(email);
      count++;
    }
    return { success: true, count };
  }
};
```

- [ ] **Step 2: Delete the tag-based prospects route**

```bash
git rm -r src/routes/prospects/contacts
```

Check `src/routes/+layout.svelte` or any nav component for a link to `/prospects/contacts` and remove/repoint it to `/prospects`.

- [ ] **Step 3: Rewrite `src/routes/api/v1/prospects/+server.ts`**

```ts
import { createRecord } from '$lib/server/teable';
import { TABLES, PROSPECT_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// POST /api/v1/prospects — used by Henry's push-to-CRM automation (plan Task 12)
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const name = (body.name as string) || [body.titel, body.vorname, body.nachname].filter(Boolean).join(' ') || null;
  if (!name) return jsonError('name (or vorname/nachname) is required', 400);

  const rec = await createRecord(TABLES.prospects, {
    [PROSPECT_FIELDS.name]: name,
    [PROSPECT_FIELDS.vorname]: (body.vorname as string) || null,
    [PROSPECT_FIELDS.nachname]: (body.nachname as string) || null,
    [PROSPECT_FIELDS.titel]: (body.titel as string) || null,
    [PROSPECT_FIELDS.anrede]: (body.anrede as string) || null,
    [PROSPECT_FIELDS.email]: (body.email as string) || null,
    [PROSPECT_FIELDS.firmaText]: (body.firma as string) || null,
    [PROSPECT_FIELDS.rolle]: (body.rolle as string) || null,
    [PROSPECT_FIELDS.telefon]: (body.telefon as string) || null,
    [PROSPECT_FIELDS.website]: (body.website as string) || null,
    [PROSPECT_FIELDS.notizen]: (body.notizen as string) || null,
    [PROSPECT_FIELDS.status]: (body.status as string) || null,
    [PROSPECT_FIELDS.kanal]: (body.kanal as string) || null,
    [PROSPECT_FIELDS.versandtAm]: (body.versandt_am as string) || null,
    [PROSPECT_FIELDS.followupAm]: (body.followup_am as string) || null,
    [PROSPECT_FIELDS.sperre]: body.sperre != null ? Boolean(body.sperre) : null,
    [PROSPECT_FIELDS.sperreGrund]: (body.sperre_grund as string) || null,
    [PROSPECT_FIELDS.herkunft]: (body.herkunft as string) || 'mass-outreach'
  });

  return jsonOk({ prospect: { id: rec.id, ...rec.fields } }, 201);
};
```

- [ ] **Step 4: Manual verification**

`./dev.sh`, open `/prospects`, filter by status/search, create/edit/promote/delete a test prospect, run a CSV import with 2 test rows (one duplicate email to confirm dedupe). Confirm `/prospects/contacts` now 404s and no nav link points to it.

- [ ] **Step 5: Commit**

```bash
git add -A src/routes/prospects src/routes/api/v1/prospects
git commit -m "feat: unify Prospects into one Teable table, remove tag-based prospect view"
```

---

## Task 9: Rewrite dashboard + actions routes

**Files:**
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/actions/+page.server.ts`

- [ ] **Step 1: Rewrite `src/routes/+page.server.ts`**

```ts
import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, AUFGABEN_FIELDS, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [aufgabenRecs, kontakteRecs, firmenRecs, interaktionenRecs] = await Promise.all([
    listRecords(TABLES.aufgabenReal),
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen),
    listRecords(TABLES.interaktionenReal)
  ]);

  const kontaktNameById = new Map(kontakteRecs.map((k) => [k.id, k.fields[KONTAKTE_FIELDS.name]]));
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name]]));

  const open_actions = aufgabenRecs
    .filter((a) => a.fields[AUFGABEN_FIELDS.status] === 'offen')
    .map((a) => ({ id: a.id, ...a.fields, contact_name: kontaktNameById.get(linkId(a.fields[AUFGABEN_FIELDS.kontakt]) ?? '') ?? null }))
    .sort((a, b) => {
      const af = a[AUFGABEN_FIELDS.faelligAm] as string | null;
      const bf = b[AUFGABEN_FIELDS.faelligAm] as string | null;
      if (!af) return 1;
      if (!bf) return -1;
      return af.localeCompare(bf);
    })
    .slice(0, 10);

  const lastActivityByContact = new Map<string, string>();
  for (const i of interaktionenRecs) {
    const cid = linkId(i.fields[INTERAKTIONEN_FIELDS.kontakt]);
    const datum = i.fields[INTERAKTIONEN_FIELDS.datum] as string;
    if (!cid || !datum) continue;
    const cur = lastActivityByContact.get(cid);
    if (!cur || datum > cur) lastActivityByContact.set(cid, datum);
  }

  const recent_contacts = kontakteRecs
    .map((c) => ({
      id: c.id,
      ...c.fields,
      company_name: firmaNameById.get(linkId(c.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null,
      last_activity: lastActivityByContact.get(c.id) ?? null
    }))
    .sort((a, b) => {
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return b.last_activity.localeCompare(a.last_activity);
    })
    .slice(0, 8);

  const stats = {
    contacts: kontakteRecs.length,
    companies: firmenRecs.length,
    open_actions: aufgabenRecs.filter((a) => a.fields[AUFGABEN_FIELDS.status] === 'offen').length
  };

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();

  return { open_actions, recent_contacts, stats, allTags };
};
```

- [ ] **Step 2: Rewrite `src/routes/actions/+page.server.ts`**

```ts
import { listRecords, createRecord, updateRecord, getRecord, linkId } from '$lib/server/teable';
import { TABLES, AUFGABEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [aufgabenRecs, kontakteRecs] = await Promise.all([
    listRecords(TABLES.aufgabenReal),
    listRecords(TABLES.kontakteReal)
  ]);
  const kontaktNameById = new Map(kontakteRecs.map((k) => [k.id, k.fields[KONTAKTE_FIELDS.name]]));

  const actions_open = aufgabenRecs
    .filter((a) => a.fields[AUFGABEN_FIELDS.status] === 'offen')
    .map((a) => ({ id: a.id, ...a.fields, contact_name: kontaktNameById.get(linkId(a.fields[AUFGABEN_FIELDS.kontakt]) ?? '') ?? null }))
    .sort((a, b) => {
      const af = a[AUFGABEN_FIELDS.faelligAm] as string | null;
      const bf = b[AUFGABEN_FIELDS.faelligAm] as string | null;
      if (!af) return 1;
      if (!bf) return -1;
      return af.localeCompare(bf);
    });

  const contacts = kontakteRecs
    .map((k) => ({ id: k.id, name: k.fields[KONTAKTE_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return { actions_open, contacts };
};

export const actions: Actions = {
  toggle: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const existing = await getRecord(TABLES.aufgabenReal, id);
    const current = existing?.fields[AUFGABEN_FIELDS.status];
    await updateRecord(TABLES.aufgabenReal, id, {
      [AUFGABEN_FIELDS.status]: current === 'offen' ? 'erledigt' : 'offen'
    });
    return { success: true };
  },
  create: async ({ request }) => {
    const d = await request.formData();
    await createRecord(TABLES.aufgabenReal, {
      [AUFGABEN_FIELDS.kontakt]: d.get('contact_id') ? [{ id: d.get('contact_id') as string }] : null,
      [AUFGABEN_FIELDS.titel]: d.get('titel'),
      [AUFGABEN_FIELDS.faelligAm]: d.get('faellig_am') || null,
      [AUFGABEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  }
};
```

- [ ] **Step 3: Manual verification**

`./dev.sh`, open `/` (dashboard) and `/actions`, confirm stats/open actions/recent contacts render, toggle+create an action from both pages.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.server.ts src/routes/actions
git commit -m "feat: migrate dashboard and actions routes to Teable"
```

---

## Task 10: Cutover — remove Postgres, deploy

**Files:**
- Modify: `package.json` (remove `postgres`, remove unused `@anthropic-ai/sdk`)
- Delete: `src/lib/db.ts`
- Modify: Coolify env for the mini-crm app (add `TEABLE_API_KEY`, `TEABLE_BASE_URL`; remove `DATABASE_URL`)
- Modify: `/data/coolify/applications/ld4mpvsus77cn8gs7ocdxjtm/docker-compose.yaml` on the Hetzner host (remove the Postgres service block if it's defined there, or separately decommission the `twenty-db-1` container)

- [ ] **Step 1: Confirm nothing still imports `$lib/db`**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && grep -rn "lib/db" src/ scripts/`

Expected: only `scripts/migrate-to-teable.ts` (fine, it's a one-time script, keep the import there — or delete the whole migration script now that it's been run and verified).

- [ ] **Step 2: Delete `src/lib/db.ts`, remove unused deps**

```bash
git rm src/lib/db.ts
npm uninstall postgres @anthropic-ai/sdk
```

- [ ] **Step 3: Full local regression pass**

`./dev.sh`, click through every route touched in Tasks 4-9 once more end-to-end (companies, contacts, prospects, actions, dashboard, photo/file upload, external API v1 with curl). This is the last check before Postgres access is removed from the deploy target.

- [ ] **Step 4: Ask Felix explicitly before this step — decommissioning Postgres is hard to reverse**

Confirm with Felix that the local regression pass (Step 3) and the count-verification (Task 3, Step 5) both passed before removing `DATABASE_URL` / touching the Postgres container. This step is the actual cutover — do not do it silently.

- [ ] **Step 5: Update Coolify env + deploy (Felix's explicit "deploy" only, per standing rule)**

Add `TEABLE_API_KEY`, `TEABLE_BASE_URL` to the Coolify app env. Follow the existing deploy process from `modules/werkbank/mini-crm/stand.md` (`docker build` → tag → `docker compose up -d --force-recreate`). Remove `DATABASE_URL` from the env only after the new build is confirmed working in production.

- [ ] **Step 6: Decommission the Postgres container**

Once `crm.hirschfeld.at` has run cleanly on Teable for a few days, stop (don't immediately delete) the `twenty-db-1` container and its volume — keep the volume as a cold backup for a few weeks before actually removing it.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove Postgres dependency, mini-crm now runs entirely on Teable"
```

---

## Task 11 (Henry repo): Interaktionen_Scraper for mass outreach

This is the original ask this whole plan grew out of — a proper touchpoint log for the mass-outreach Teable base, separate from Kontakte_Real/Interaktionen_Real above (this is the cold-outreach side, not the real-contacts side).

**Files (in `/Users/felix/Documents/Henry/`):**
- Modify: `modules/marketing/scripts/ingest_outreach_auswahl.py` (write to Interaktionen_Scraper in addition to Outreach's `Notiz`)
- Modify: `data/teable-config.json` (add `mo_interaktionen_scraper` table ID)
- Modify: `modules/marketing/scraper/teable-workflow.md` (document the new table, mark `Verlauf`/`Notiz` fields as legacy/frozen)

- [ ] **Step 1:** In Teable base `marketing_outreach`, manually create table `Interaktionen_Scraper`: `Outreach` (link → Outreach B, single, required), `Typ` (single select: gesendet, notiz, antwort, follow_up), `Datum` (date+time), `Kanal` (single line text), `Text` (long text). Also rename table "Kontakte" (`tbltBCdkAvxz1R95ErY`) to "Kontakte_Scraper" in the Teable UI (display-name only, ID unchanged — no script needs updating since everything references the ID).
- [ ] **Step 2:** Record the new table ID in `data/teable-config.json` under `tables.mo_interaktionen_scraper`.
- [ ] **Step 3:** Update `ingest_outreach_auswahl.py`'s `teable_create_record` call for the Outreach table (around line 121-123) to also call `teable_create_record(base, key, INTERAKTIONEN_SCRAPER_TBL, {"Outreach": [{"id": created_outreach_id}], "Typ": "gesendet", "Datum": ..., "Kanal": ..., "Text": e.get("notiz", "")})` right after creating the Outreach record, using the real created record's id (currently discarded — Step to fix: capture `created_record["records"][0]["id"]` from `teable_create_record`'s return value instead of ignoring it).
- [ ] **Step 4:** Update `teable-workflow.md`'s "Outreach (B)" field table to mark `Verlauf` and `Notiz` as "Legacy (bis 07.2026) — neue Einträge ab jetzt in Interaktionen_Scraper (D)".
- [ ] **Step 5: Commit**

```bash
cd /Users/felix/Documents/Henry
git add data/teable-config.json modules/marketing/scripts/ingest_outreach_auswahl.py modules/marketing/scraper/teable-workflow.md
git commit -m "feat(marketing): add Interaktionen_Scraper touchpoint log, deprecate Verlauf/Notiz text fields"
```

---

## Task 12 (Henry repo): Push-to-Prospects automation

Not built in this pass — noted here so it isn't lost. When an Outreach (B) record's `Status` flips to `geantwortet` / `gespräch_geführt` / `termin_gebucht`, Henry should call `POST https://crm.hirschfeld.at/api/v1/prospects` (Task 8's rewritten endpoint) with the contact's data and `herkunft: "mass-outreach"`. This closes the loop described earlier in this conversation (Teil 2 of the original design) but needs its own plan — it touches the Rücklauf-Workflow in `modules/marketing/SKILL.md`, not just a single script. Flag as next step, do not build inline here.

---

## Task 13 (Henry repo): Update docs/memory to match the new architecture

**Files:**
- Modify: `/Users/felix/Documents/Henry/modules/werkbank/mini-crm/stand.md`
- Modify: `/Users/felix/Documents/Henry/modules/werkbank/marketing/stand.md`
- Modify: `/Users/felix/Documents/Henry/data/dienste-referenz.md`
- Modify: `/Users/felix/Documents/Henry/.claude` memory file `reference_twenty_crm.md` (via memory update, not a git commit)

- [ ] **Step 1:** Update `modules/werkbank/mini-crm/stand.md` — mini-crm now runs on Teable, not Postgres; REST API v1 endpoints unchanged in shape but backed by Teable; `/prospects/contacts` removed; `DATABASE_URL` gone from env.
- [ ] **Step 2:** Update `modules/werkbank/marketing/stand.md` — note the CRM consolidation decision and link to this plan file's path for detail.
- [ ] **Step 3:** Update `data/dienste-referenz.md`'s Teable section with the new `crm_*` table IDs from Task 1.
- [ ] **Step 4:** Update the `reference-mini-crm` memory file content to reflect Teable-backed storage instead of "SvelteKit + PostgreSQL".
- [ ] **Step 5: Commit (Henry repo)**

```bash
cd /Users/felix/Documents/Henry
git add modules/werkbank/mini-crm/stand.md modules/werkbank/marketing/stand.md data/dienste-referenz.md
git commit -m "docs: update mini-crm/marketing werkbank + Teable reference for Teable-backed CRM"
```

---

## Self-Review

**Spec coverage:** Task 0-3 cover the missing schema/client/migration foundation. Tasks 4-9 cover all 19 originally-identified DB-touching files (Firmen×4, Kontakte core×5, Photo/Files×3, API v1 contacts×2, Prospects×3 [incl. deletion of the tag-based route], Dashboard/Actions×2 = 19 total ✓). Task 10 covers cutover. Tasks 11-13 cover the original mass-outreach ask (Interaktionen_Scraper) plus the cross-system push automation and doc updates raised during the conversation.

**Placeholder scan:** no TBD/TODO left in code steps except the intentional `tbl_TODO_*` schema-constant placeholders in Task 2 Step 2, which are explicitly filled in during Task 3 Step 2 from Task 1's real output — this is a genuine data dependency (the IDs don't exist until Task 1 runs), not a placeholder-as-cop-out.

**Type consistency:** `TeableRecord<F>`, `link()`, `linkId()` from Task 2 are used with the same names/signatures in every later task. Field-name constants (`KONTAKTE_FIELDS.firma` etc.) are referenced consistently — verified no task uses a field key not defined in Task 2 Step 2's `teable-schema.ts`.
