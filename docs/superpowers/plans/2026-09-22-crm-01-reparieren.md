# CRM Runde 1 — Reparieren: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Datenverlust im Scan-Formular beheben, das gescheiterte Dach-Experiment verwerfen und die drei billigsten Bedienprobleme (Kontrast, Dialoge ohne Tastatur, irreführender Leerzustand) in einem Tag erledigen.

**Architecture:** Jede Änderung mit Logik wird in ein kleines, reines TypeScript-Modul unter `src/lib/` gelegt, das ohne SvelteKit im Node-Testrunner läuft. Die Svelte-Dateien rufen diese Module nur noch auf. Dadurch gibt es echte Tests, obwohl das Projekt bisher keinen Komponenten-Testrunner hat.

**Tech Stack:** SvelteKit 2, Svelte 5 (Runes), Tailwind 4, TypeScript, Node 22.21 (`node --test`, Typ-Stripping funktioniert schon).

**Spec:** `docs/superpowers/plans/2026-09-22-crm-00-uebersicht.md` und die Audit-Berichte `1-ui.md`, `2-ux.md`, `3-code.md`.

## Global Constraints

- Arbeitsverzeichnis: `/Users/felix/Documents/Programmieren/mini-crm`.
- Tests: nur reine Module, Import mit Endung `.ts` (`../src/lib/x.ts`), kein `$app/…`, kein `$lib/…` in getesteten Modulen.
- Kein `git push`, kein `./deploy.sh` ohne ausdrückliche Freigabe von Felix.
- Kontrast: jede Textfarbe mindestens **4,5:1**. Farben werden im Test nachgerechnet, nicht geschätzt.
- Farbwerte: Text `#2b221d`, gedämpft `#70625a`, Grund `#f9f6f2`, Karte `#ffffff`, Sand `#e6c5a8`, Henry-Rot `#904446`.
- Commit-Nachrichten enden mit der Zeile `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Sprache in der Oberfläche: Deutsch, Sie-Form vermeiden, wie im Bestand.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `package.json` | ändern | `test`-Script |
| `tests/views.integration.test.ts` | ändern | schreibt nur noch mit `RUN_LIVE=1` ins echte Teable |
| `src/lib/contrast.ts` | neu | Kontrast-Rechnung (WCAG) |
| `tests/contrast.test.ts` | neu | nagelt die Farbpaare fest |
| `src/app.css` | ändern | Token `--color-ink-soft` |
| `src/lib/components/ToastContainer.svelte` | ändern | lesbare Toast-Farben, längere Anzeige |
| `src/lib/toast.ts` | ändern | 6 s statt 3,5 s, Fehler 8 s |
| `src/lib/firma-match.ts` | neu | Firma nach Name finden |
| `tests/firma-match.test.ts` | neu | Tests dazu |
| `src/routes/contacts/+page.server.ts` | ändern | Scan-Firma auflösen |
| `src/lib/local-date.ts` | neu | Datum in Ortszeit statt UTC |
| `tests/local-date.test.ts` | neu | Tests dazu |
| `src/lib/actions/modal.ts` | neu | Esc, Autofokus, Tab-Falle, Fokus zurück |
| `tests/modal.test.ts` | neu | Test der Tab-Reihenfolge |
| `src/lib/components/InteractionDialog.svelte` | ändern | nutzt Modal-Aktion und Ortszeit |
| `src/lib/components/EmailDialog.svelte` | ändern | nutzt Modal-Aktion |
| `src/routes/+layout.svelte` | verwerfen (Task 0) | Dach-Experiment rückgängig, kein Feature-Task |
| `src/routes/contacts/+page.svelte` | ändern | Leerzustand mit „Filter zurücksetzen" |

---

### Task 0: Ausgangslage sichern

**Files:**
- Modify: `package.json`
- Modify: `tests/views.integration.test.ts`

**Interfaces:**
- Produces: `npm test` läuft alle Unit-Tests, ohne ins echte Teable zu schreiben.

- [ ] **Step 1: Dach-Experiment verwerfen (Entscheidung Felix, 22.09.2026)**

Felix hatte versucht, CRM, Todoist und Emma Mail über eine gemeinsame Kopfleiste („Dach") in einem Fenster zu verbinden — mit `localhost`-Links zwischen den drei Diensten. Sein Wort dazu: „das war nur für mich weil ich gedacht habe das crm todoist und emma gut in ein fenster passen würden das hat aber so manches schwieriger gemacht." Der Versuch ist gescheitert und wird **verworfen, nicht nur gegatet** — Task 3 (ursprünglich „Dach-Leiste nur lokal zeigen") entfällt damit vollständig, siehe dort.

```bash
cd /Users/felix/Documents/Programmieren/mini-crm
git status --short
git diff src/routes/+layout.server.ts src/routes/+layout.svelte
```

Erwartet: Änderungen in `src/routes/+layout.server.ts` (Dev-Bypass, unabhängig vom Dach) und `src/routes/+layout.svelte` (die Dach-Leiste selbst: `<link rel="stylesheet" href="/design/dach.css">`, `<script src="/design/dach.js">`, das `<nav class="dach">`-Element und die zusätzliche Wrapper-`div`).

`+layout.svelte` verwerfen — an dieser Datei hat bisher kein anderer Task dieses Plans gearbeitet, der Verlust betrifft nur das Dach-Experiment:

```bash
git checkout -- src/routes/+layout.svelte
git diff src/routes/+layout.svelte
```

Erwartet: keine Ausgabe (Datei ist wieder auf dem Stand von `HEAD`, ohne Dach-Leiste).

`+layout.server.ts` bleibt unangetastet — der Dev-Bypass hat mit dem Dach nichts zu tun, und Runde 2 (Absichern) ersetzt diese Datei ohnehin komplett (dort Task 5).

Nicht anfassen: `.planning/`, `bun.lock`, `static/viewport-check.html` (untracked, gehören nicht zu diesem Plan). `static/design/dach.css`/`dach.js` bleiben liegen (schon committet, Aufräumen ist kein Teil dieses Plans).

- [ ] **Step 2: Das echte-Teable-Risiko im Integrationstest entschärfen**

```bash
sed -n 1,30p tests/views.integration.test.ts
```

Direkt nach den Imports einfügen (Anpassung an den vorhandenen Testaufbau: der erste `test(` bzw. `describe(` bekommt die Option `{ skip }`):

```ts
const skip = process.env.RUN_LIVE === '1' ? false : 'nur mit RUN_LIVE=1 (schreibt ins echte Teable)';
```

und bei jedem `test('…', async () => {…})` in dieser Datei die Form `test('…', { skip }, async () => {…})` verwenden.

- [ ] **Step 3: `test`-Script eintragen**

In `package.json` unter `"scripts"` ergänzen:

```json
"test": "node --test tests/*.test.ts"
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: 17 Tests grün, der Integrationstest erscheint als `skipped`. Es entsteht kein neuer Eintrag in Teable.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/views.integration.test.ts
git commit -m "test: npm test, Live-Test nur mit RUN_LIVE=1" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 1: Toast lesbar machen (Kontrast, Anzeigedauer)

**Files:**
- Create: `src/lib/contrast.ts`
- Test: `tests/contrast.test.ts`
- Modify: `src/lib/components/ToastContainer.svelte`
- Modify: `src/lib/toast.ts:12`

**Interfaces:**
- Produces: `contrastRatio(fgHex: string, bgHex: string): number` und `mixOver(fgHex: string, bgHex: string, alpha: number): string`. Task 2 nutzt beide im Test.

- [ ] **Step 1: Failing test schreiben**

`tests/contrast.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio } from '../src/lib/contrast.ts';

const INK = '#2b221d';
const CREAM = '#f9f6f2';
const SAND = '#e6c5a8';
const RED = '#904446';
const WHITE = '#ffffff';

test('contrastRatio: schwarz auf weiß ist 21', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
});

test('Toast success: dunkler Text auf Sand', () => {
  assert.ok(contrastRatio(INK, SAND) >= 4.5);
});

test('Toast error: weißer Text auf Henry-Rot', () => {
  assert.ok(contrastRatio(WHITE, RED) >= 4.5);
});

test('Toast info: weißer Text auf Ink', () => {
  assert.ok(contrastRatio(WHITE, INK) >= 4.5);
});

test('alter Toast (weiß auf Sand) fiel durch — Beleg für den Fix', () => {
  assert.ok(contrastRatio(WHITE, SAND) < 3);
});

test('ink-soft #70625a hält 4,5:1 auf Grund und Karte', () => {
  assert.ok(contrastRatio('#70625a', CREAM) >= 4.5);
  assert.ok(contrastRatio('#70625a', WHITE) >= 4.5);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `node --test tests/contrast.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/contrast.ts'`.

- [ ] **Step 3: Modul schreiben**

`src/lib/contrast.ts`:

```ts
function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function luminance(hex: string): number {
  const f = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = channels(hex).map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-Kontrastverhältnis, 1 bis 21. */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const a = luminance(fgHex);
  const b = luminance(bgHex);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Farbe mit Deckkraft über einen Grund gelegt, als Hex. */
export function mixOver(fgHex: string, bgHex: string, alpha: number): string {
  const fg = channels(fgHex);
  const bg = channels(bgHex);
  const out = fg.map((v, i) => Math.round((v * alpha + bg[i] * (1 - alpha)) * 255));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg sehen**

Run: `node --test tests/contrast.test.ts`
Expected: 6 Tests PASS.

- [ ] **Step 5: Toast-Farben ändern**

`src/lib/components/ToastContainer.svelte`, die `div` in der Schleife ersetzen:

```svelte
    <div class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
      {t.type === 'success' ? 'bg-sage text-ink' : t.type === 'error' ? 'bg-primary text-white' : 'bg-ink text-white'}"
      role={t.type === 'error' ? 'alert' : 'status'}>
      {t.message}
    </div>
```

Falls `bg-primary` in Tailwind nicht definiert ist (`grep -n "color-primary" src/app.css`), stattdessen `bg-[#904446]` schreiben.

- [ ] **Step 6: Anzeigedauer verlängern**

`src/lib/toast.ts`, `add` ändern:

```ts
function add(message: string, type: Toast['type'] = 'info') {
  const id = nextId++;
  update(toasts => [...toasts, { id, message, type }]);
  setTimeout(() => remove(id), type === 'error' ? 8000 : 6000);
}
```

- [ ] **Step 7: Sichtprüfung**

Run: `./dev.sh`, im Browser einen Kontakt speichern. Der Toast ist dunkel auf Sand, gut lesbar, bleibt 6 Sekunden.

- [ ] **Step 8: Commit**

```bash
git add src/lib/contrast.ts tests/contrast.test.ts src/lib/components/ToastContainer.svelte src/lib/toast.ts
git commit -m "fix(ui): Toast lesbar (Kontrast 1,6 → 9,6) und länger sichtbar" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Graue Texte durch festen Ton ersetzen

**Files:**
- Modify: `src/app.css` (Block mit `--color-ink`, ca. Zeile 6)
- Modify: alle `.svelte`-Dateien mit `text-ink/20` bis `text-ink/69` (133 Stellen)
- Test: `tests/contrast.test.ts` (ergänzen)

**Interfaces:**
- Consumes: `mixOver`, `contrastRatio` aus Task 1.
- Produces: Tailwind-Klasse `text-ink-soft` (Farbe `#70625a`).

Hintergrund (gemessen): `ink/40` = 2,4:1, `ink/50` = 3,1:1, `ink/60` = 4,1:1, erst `ink/70` = 5,6:1. Alles darunter fällt durch.

- [ ] **Step 1: Test ergänzen, der das Problem belegt**

An `tests/contrast.test.ts` anhängen (und oben `mixOver` importieren):

```ts
import { mixOver } from '../src/lib/contrast.ts';

test('ink/40 und ink/60 auf Grund fallen durch, ink/70 besteht', () => {
  assert.ok(contrastRatio(mixOver(INK, CREAM, 0.4), CREAM) < 3);
  assert.ok(contrastRatio(mixOver(INK, CREAM, 0.6), CREAM) < 4.5);
  assert.ok(contrastRatio(mixOver(INK, CREAM, 0.7), CREAM) >= 4.5);
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `node --test tests/contrast.test.ts`
Expected: PASS (der Test dokumentiert den Ist-Zustand und die Schwelle).

- [ ] **Step 3: Token anlegen**

In `src/app.css` im Theme-Block direkt unter `--color-ink: var(--foreground);` einfügen:

```css
  --color-ink-soft:       var(--foreground-dim);
```

- [ ] **Step 4: Zählen, was betroffen ist**

```bash
grep -rEo 'text-ink/(2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\b' src | wc -l
```

Expected: etwa 133.

- [ ] **Step 5: Ersetzen (nur `text-ink/…`, nicht `bg-ink/…` und nicht `placeholder-…`)**

```bash
grep -rlE 'text-ink/(2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\b' src \
  | xargs sed -i '' -E 's#text-ink/(2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\b#text-ink-soft#g'
grep -rEo 'text-ink/(2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\b' src | wc -l
```

Expected: `0`. `text-ink/15` (dekorative Leer-Symbole) bleibt absichtlich.

- [ ] **Step 6: Visuell prüfen**

Run: `./dev.sh`. Kontaktliste, Firmenliste, Kontaktdetail öffnen. Spaltenköpfe und Nebentexte sind jetzt gut lesbar, zwei Stufen (`text-ink` und `text-ink-soft`) statt vieler Grauabstufungen. Falls ein Bereich zu flach wirkt, ist das Absicht: Hierarchie kommt über Größe und Gewicht, nicht über Blässe.

- [ ] **Step 7: Commit**

```bash
git add -A src tests/contrast.test.ts
git commit -m "fix(ui): 133 blasse Textstellen auf festen Ton #70625a (Kontrast 5,4:1)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Hinweis: `git add -A src` nimmt nur `src/` mit. Untracked Dateien außerhalb (`.planning/`, `bun.lock`) bleiben unberührt. Vorher `git status --short` ansehen.

---

### Task 3: entfällt — Dach-Kopfleiste wird verworfen, nicht gegatet

Ursprünglich sollte hier die Dach-Leiste per `page.url.hostname` auf `localhost` beschränkt werden. Felix hat das Dach-Experiment (CRM, Todoist und Emma Mail in einem gemeinsamen Fenster) am 22.09.2026 aufgegeben — es hat mehr Probleme gemacht als gelöst. Task 0 Step 1 verwirft die Leiste deshalb bereits vollständig (`git checkout -- src/routes/+layout.svelte`). Dieser Task bleibt als Platzhalter stehen, damit die Nummerierung der folgenden Tasks unverändert zitierbar bleibt.

---

### Task 4: Scan-Firma geht nicht mehr verloren

**Files:**
- Create: `src/lib/firma-match.ts`
- Test: `tests/firma-match.test.ts`
- Modify: `src/routes/contacts/+page.server.ts` (Funktion `extractContactFields` ab Zeile ~100 und Action `create` ab Zeile ~126)

**Interfaces:**
- Produces: `normalizeFirmaName(s: string): string` und `findFirmaId(companies: { id: string; fields: Record<string, unknown> }[], nameField: string, wanted: string): string | null`.

Ursache (belegt): `scan/+page.svelte:133` sendet das Feld `firma_name`, `contacts/+page.server.ts:113` liest nur `company_id`. Der Kontakt wird angelegt, die Firma verschwindet, und die Oberfläche meldet trotzdem „Kontakt erstellt".

- [ ] **Step 1: Failing test schreiben**

`tests/firma-match.test.ts`:

```ts
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
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/firma-match.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Modul schreiben**

`src/lib/firma-match.ts`:

```ts
export function normalizeFirmaName(s: string): string {
  return s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findFirmaId(
  companies: { id: string; fields: Record<string, unknown> }[],
  nameField: string,
  wanted: string
): string | null {
  const target = normalizeFirmaName(wanted);
  if (!target) return null;
  for (const c of companies) {
    const n = c.fields[nameField];
    if (typeof n === 'string' && normalizeFirmaName(n) === target) return c.id;
  }
  return null;
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/firma-match.test.ts`
Expected: 5 Tests PASS.

- [ ] **Step 5: Server anpassen**

```bash
sed -n 1,12p src/routes/contacts/+page.server.ts
sed -n 44,62p src/lib/server/teable.ts
```

Prüfen: sind `listRecords`, `createRecord`, `TABLES`, `FIRMEN_FIELDS` importiert, und wie lautet die Signatur von `listRecords` (Teable-Datei Zeile 47)? Fehlende Importe ergänzen. Dann in `src/routes/contacts/+page.server.ts`:

Import ergänzen:

```ts
import { findFirmaId } from '$lib/firma-match';
```

Direkt vor `function extractContactFields` einfügen:

```ts
async function resolveCompanyId(d: FormData): Promise<string | null> {
  const direct = d.get('company_id') as string | null;
  if (direct) return direct;
  const name = ((d.get('firma_name') as string) || '').trim();
  if (!name) return null;
  const companies = await listRecords(TABLES.firmen);
  const hit = findFirmaId(companies, FIRMEN_FIELDS.name, name);
  if (hit) return hit;
  const created = await createRecord(TABLES.firmen, { [FIRMEN_FIELDS.name]: name });
  return created.id;
}
```

`extractContactFields` bekommt die aufgelöste ID als zweiten Parameter. Die Zeile mit `KONTAKTE_FIELDS.firma` lautet danach:

```ts
    [KONTAKTE_FIELDS.firma]: companyId ? [{ id: companyId }] : null,
```

und die Signatur `function extractContactFields(d: FormData, companyId: string | null)`.

Die Action `create` ändern:

```ts
  create: async ({ request }) => {
    const d = await request.formData();
    const companyId = await resolveCompanyId(d);
    const rec = await createRecord(TABLES.kontakteReal, extractContactFields(d, companyId));
    return { success: true, id: rec.id };
  },
```

Die Action `update` (gleiche Datei): dort steht `extractContactFields(d)`. Ändern auf `extractContactFields(d, (d.get('company_id') as string) || null)`, damit sich das Verhalten beim Bearbeiten nicht ändert.

Entscheidung 1b: legt eine unbekannte Firma neu an. Wenn Felix „nur verknüpfen" wählt, die zwei Zeilen `const created…` / `return created.id;` durch `return null;` ersetzen.

- [ ] **Step 6: Typprüfung**

Run: `npx svelte-kit sync && npx tsc --noEmit 2>&1 | head -20`
Expected: keine neuen Fehler in `contacts/+page.server.ts`. (Vorhandene Altfehler anderswo bleiben unberührt, nicht anfassen.)

- [ ] **Step 7: Von Hand prüfen**

Run: `./dev.sh`, Seite `/scan`.
1. Kontakt mit Firma „Musterkanzlei GmbH" scannen oder eintippen, speichern. Die Firma steht am Kontakt.
2. Gleichen Kontakt mit `musterkanzlei gmbh` (klein) anlegen. Es entsteht **keine** zweite Firma.
3. Firmenliste öffnen: genau eine Zeile.

Testdaten danach als Felix im CRM wieder entfernen (er entscheidet, was gelöscht wird).

- [ ] **Step 8: Commit**

```bash
git add src/lib/firma-match.ts tests/firma-match.test.ts src/routes/contacts/+page.server.ts
git commit -m "fix(scan): gescannte Firma wird verknüpft statt verworfen" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Dialoge mit Tastatur und lokalem Datum

**Files:**
- Create: `src/lib/actions/modal.ts`
- Test: `tests/modal.test.ts`
- Create: `src/lib/local-date.ts`
- Test: `tests/local-date.test.ts`
- Modify: `src/lib/components/InteractionDialog.svelte:21-24,27`
- Modify: `src/lib/components/EmailDialog.svelte:24`

**Interfaces:**
- Produces: `nextFocusIndex(count: number, current: number, backwards: boolean): number`, Svelte-Aktion `modal(node: HTMLElement, opts?: { onclose?: () => void })` und `localIsoDate(d?: Date): string`.

- [ ] **Step 1: Failing tests schreiben**

`tests/modal.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusIndex } from '../src/lib/actions/modal.ts';

test('Tab springt zum nächsten Element', () => {
  assert.equal(nextFocusIndex(4, 1, false), 2);
});

test('Tab am Ende springt an den Anfang', () => {
  assert.equal(nextFocusIndex(4, 3, false), 0);
});

test('Shift+Tab am Anfang springt ans Ende', () => {
  assert.equal(nextFocusIndex(4, 0, true), 3);
});

test('Fokus außerhalb: Tab geht zum ersten, Shift+Tab zum letzten', () => {
  assert.equal(nextFocusIndex(4, -1, false), 0);
  assert.equal(nextFocusIndex(4, -1, true), 3);
});

test('keine fokussierbaren Elemente ergibt -1', () => {
  assert.equal(nextFocusIndex(0, -1, false), -1);
});
```

`tests/local-date.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localIsoDate } from '../src/lib/local-date.ts';

test('localIsoDate: 23:30 Ortszeit bleibt derselbe Tag (kein UTC-Sprung)', () => {
  assert.equal(localIsoDate(new Date(2026, 8, 22, 23, 30)), '2026-09-22');
});

test('localIsoDate: 00:10 Ortszeit ist der neue Tag', () => {
  assert.equal(localIsoDate(new Date(2026, 8, 23, 0, 10)), '2026-09-23');
});

test('localIsoDate: einstellige Monate und Tage mit Null', () => {
  assert.equal(localIsoDate(new Date(2026, 0, 5, 12, 0)), '2026-01-05');
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/modal.test.ts tests/local-date.test.ts`
Expected: FAIL — Module fehlen.

- [ ] **Step 3: Module schreiben**

`src/lib/local-date.ts`:

```ts
/** Heutiges Datum als YYYY-MM-DD in Ortszeit (toISOString liefert UTC und springt abends auf morgen). */
export function localIsoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
```

`src/lib/actions/modal.ts`:

```ts
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function nextFocusIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  if (backwards) return current === 0 ? count - 1 : current - 1;
  return current === count - 1 ? 0 : current + 1;
}

/** Dialog-Verhalten: Rolle, Autofokus, Esc schließt, Tab bleibt im Dialog, Fokus geht zurück. */
export function modal(node: HTMLElement, options: { onclose?: () => void } = {}) {
  let opts = options;
  const previous = document.activeElement as HTMLElement | null;
  node.setAttribute('role', 'dialog');
  node.setAttribute('aria-modal', 'true');

  const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
  (node.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0])?.focus();

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      opts.onclose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = items();
    if (!list.length) return;
    e.preventDefault();
    const i = nextFocusIndex(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey);
    list[i].focus();
  }
  node.addEventListener('keydown', onKey);

  return {
    update(next: { onclose?: () => void }) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('keydown', onKey);
      previous?.focus?.();
    }
  };
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/modal.test.ts tests/local-date.test.ts`
Expected: 8 Tests PASS.

- [ ] **Step 5: InteractionDialog umbauen**

In `src/lib/components/InteractionDialog.svelte`:

Import ergänzen:

```ts
  import { modal } from '$lib/actions/modal';
  import { localIsoDate } from '$lib/local-date';
```

Zeile `let today = $derived(new Date().toISOString().split('T')[0]);` ersetzen durch:

```ts
  const today = localIsoDate();
```

Die innere Karte `<div class="bg-surface rounded-xl border border-line shadow-xl w-full max-w-md">` bekommt die Aktion:

```svelte
  <div use:modal={{ onclose }} class="bg-surface rounded-xl border border-line shadow-xl w-full max-w-md" aria-label="Interaktion erfassen">
```

Das `<select id="typ" …>` bekommt das Attribut `data-autofocus`. Der Schließen-Knopf (X) bekommt `aria-label="Schließen"`.

- [ ] **Step 6: EmailDialog umbauen**

`src/lib/components/EmailDialog.svelte`: gleiche Schritte. Import `modal`, an die innere Karte `use:modal={{ onclose }}` und `aria-label="E-Mail erfassen"`, an das erste Eingabefeld `data-autofocus`. (Zeile 24 ist der Backdrop mit `onclick`, die Karte ist das erste Kind-`div`.) Falls der Prop dort anders als `onclose` heißt, den vorhandenen Namen verwenden.

- [ ] **Step 7: Von Hand prüfen**

Run: `./dev.sh`, Kontakt öffnen, „Interaktion erfassen".
1. Der Cursor steht sofort im Feld „Typ".
2. Tab wandert nur durch den Dialog und springt vom letzten Feld zum ersten.
3. Esc schließt den Dialog, der Fokus liegt wieder auf dem Knopf, der ihn geöffnet hat.
4. Um 23:30 ist das Vorschlagsdatum heute (Ortszeit). Zum Prüfen: Rechner-Datum nicht ändern, stattdessen den Test aus Step 4 als Beleg nehmen.

- [ ] **Step 8: Commit**

```bash
git add src/lib/actions/modal.ts src/lib/local-date.ts tests/modal.test.ts tests/local-date.test.ts src/lib/components/InteractionDialog.svelte src/lib/components/EmailDialog.svelte
git commit -m "fix(a11y): Dialoge mit Esc, Autofokus, Tab-Falle; Datum in Ortszeit" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Leerzustand mit Ausweg

**Files:**
- Modify: `src/routes/contacts/+page.svelte:380-384`

**Interfaces:**
- Consumes: `page` aus `$app/state`. Falls in dieser Datei noch nicht importiert: `import { page } from '$app/state';`.

Heute steht bei aktivem Filter ohne Treffer „Noch keine Kontakte", als wäre das CRM leer. Der bestehende Knopf „Filter löschen" erscheint nur für Tag-Filter.

- [ ] **Step 1: Ableitung ergänzen**

Im Script-Block:

```ts
  const hatFilter = $derived([...page.url.searchParams.keys()].some((k) => k !== 'detail'));
```

- [ ] **Step 2: Leerzustand ersetzen**

Den `<p class="text-sm font-medium text-ink-soft">…</p>` (Task 2 hat die Farbe schon umgestellt) im Block `{#if data.contacts.length === 0}` ersetzen durch:

```svelte
        <p class="text-sm font-medium text-ink-soft">
          {data.q ? `Keine Ergebnisse für „${data.q}"` : hatFilter ? 'Kein Kontakt passt zu diesen Filtern' : 'Noch keine Kontakte'}
        </p>
        {#if hatFilter}
          <a href="/contacts" class="inline-block mt-3 text-sm text-terracotta hover:underline">Filter zurücksetzen</a>
        {/if}
```

- [ ] **Step 3: Prüfen**

Run: `./dev.sh`, `/contacts?q=zzzzzz` öffnen. Erwartet: „Keine Ergebnisse für „zzzzzz"" und darunter „Filter zurücksetzen". Klick führt zur vollen Liste. Auf einer wirklich leeren Liste (kein Filter) erscheint der Knopf nicht.

- [ ] **Step 4: Commit**

```bash
git add src/routes/contacts/+page.svelte
git commit -m "fix(ux): Leerzustand bei Filter mit Ausweg statt 'Noch keine Kontakte'" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Abschluss der Runde

- [ ] **Step 1: Alle Tests**

Run: `npm test`
Expected: alle grün (17 alte + 6 + 1 + 5 + 5 + 3 neue), Integrationstest übersprungen.

- [ ] **Step 2: Build läuft durch**

Run: `npm run build 2>&1 | tail -8`
Expected: Build endet ohne Fehler. (Dafür muss `TEABLE_API_KEY` in der Umgebung stehen, siehe Runde 2 Task 9. `set -a; . ./.env; set +a` vorher.)

- [ ] **Step 3: Sichtabnahme mit Felix**

`./dev.sh` starten und Felix folgende sechs Dinge zeigen: Toast, graue Texte, Scan mit Firma, Dialog mit Esc, Seite ohne Dach-Leiste unter einem anderen Hostnamen, Leerzustand. Auch `/qa` bietet sich hier an.

- [ ] **Step 4: Freigabe abwarten**

**Kein Push, kein Deploy.** Felix sagt „push das" / „deploy das", dann wird `./deploy.sh` ausgeführt. Nach dem Deploy: `curl -s -o /dev/null -w "%{http_code}\n" https://crm.hirschfeld.at/` erwartet `302` (Türsteher), die Sichtprüfung dann mit Login im Browser.

- [ ] **Step 5: Dokumentation**

Eintrag in `data/work-log.json` und Werkbank (sobald es einen CRM-Ordner gibt). Ein Satz für das Changelog von Henry: „CRM Runde 1: Scan-Firma repariert, Kontraste, Dialoge mit Tastatur, Leerzustand."

## Self-Review (gegen die Audits)

- Scan-Firma (UX #2): Task 4. ✔
- Toast 1,6:1 und `ink/40` 133× (UI #2, #3; Code #9): Tasks 1 und 2. ✔
- Dialoge ohne Esc/Fokus, UTC-Datum (UX #5, Quick Win 4; Code #9): Task 5. ✔
- localhost-Links/Dach-Experiment (UI, UX #8, Integration): Task 0 Step 1 (verworfen, nicht nur gegatet — Felix' Entscheidung 22.09.2026). Task 3 entfällt. ✔
- Leerzustand (UX #9, Quick Win 2): Task 6. ✔
- Toast länger: Task 1 Step 6. Undo bewusst **nicht** in dieser Runde: es braucht „archivieren statt löschen" (Entscheidung 3a). ✔
- Nicht in Runde 1, mit Absicht: Login/Sicherheit (Runde 2), Bernstein-Angleichung und Filter-Lärm (Runde 3), Emma (Runde 4).
- Typkonsistenz: `mixOver`/`contrastRatio` (Task 1 → Task 2), `nextFocusIndex`/`modal` (Task 5), `findFirmaId` (Task 4), `localIsoDate` (Task 5): Namen und Signaturen stimmen überall überein.
