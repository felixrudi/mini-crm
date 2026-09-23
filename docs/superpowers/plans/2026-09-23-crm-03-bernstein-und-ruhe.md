# CRM Runde 3 — Bernstein & Ruhe: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Standard-Theme des CRM auf das echte Bernstein-Design umstellen, die Filterleiste bei Kontakten und Firmen beruhigen (Suche immer sichtbar, Rest hinter einem Aufklapper), Löschen durch Archivieren ersetzen (nie hart löschen), und drei konkrete Handy-Bugs beheben: unsichtbare Bedienelemente ohne Hover, eine zu schmale Aktionsspalte und dadurch umbrechende Telefonnummern.

**Architecture:** Wie in Runde 1/2: jede Änderung mit Logik (Archiv-Tag setzen, Filter-Anzahl zählen) wird in ein reines TypeScript-Modul unter `src/lib/` gelegt und mit `node --test` geprüft. Svelte-Dateien und Server-Actions rufen diese Module nur auf. Farb-/Kontrast-Änderungen werden mit dem in Runde 1 gebauten `src/lib/contrast.ts` (`contrastRatio`, `mixOver`) numerisch nachgerechnet, nicht geschätzt.

**Tech Stack:** SvelteKit 2, Svelte 5 (Runes), Tailwind 4, TypeScript, Node 22 (`node --test`).

**Spec:** `docs/superpowers/plans/2026-09-22-crm-00-uebersicht.md`, Audit `1-ui.md`/`2-ux.md` (gebündelt in `Henry/modules/werkbank/crm/berichte/0922-crm-audit-und-plan.html`), und Felix' Entscheidungen vom 23.09.2026: 3a = archiv-Tag nutzen (vorhandene Infrastruktur, kein neues Feld), 3b = Startansicht bleibt die Kontaktliste (kein neuer Task), 3c = Suche + ein Aufklapper „Filter", Scope = nur der Kern (Tag-Management und „Nächster Schritt"-Feld verschieben sich auf eine spätere Runde).

## Global Constraints

- Arbeitsverzeichnis: `/Users/felix/Documents/Programmieren/mini-crm`.
- Tests: nur reine Module, Import mit Endung `.ts` (`../src/lib/x.ts`), kein `$app/…`, kein `$lib/…` in getesteten Modulen.
- Kein `git push`, kein `./deploy.sh` ohne ausdrückliche Freigabe von Felix.
- Kontrast: jede Textfarbe mindestens **4,5:1**, nachgerechnet mit `contrastRatio`/`mixOver` aus `src/lib/contrast.ts`, nicht geschätzt.
- Nie hart löschen — jede „Löschen"-Aktion an Kontakten/Firmen setzt stattdessen den Tag `archiv` (vorhandene Infrastruktur: `DEFAULT_TAGS_EXCLUDE`, `hatArchivUmschalter`, „Aktuell"/„Alle"-Umschalter in `ViewTabs.svelte`).
- Commit-Nachrichten enden mit der Zeile `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Sprache in der Oberfläche: Deutsch, Sie-Form vermeiden, wie im Bestand.
- Scope dieser Runde: **nur** Bernstein-Angleichung, Filter-Ruhe, Handy-Bugfixes, Löschen→Archivieren. Tag-Management und „Nächster Schritt"-Feld sind bewusst **nicht** Teil dieser Runde (Felix' Entscheidung, 23.09.2026).

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `src/app.css` | ändern | `light-hybrid`-Theme (Standard) auf echte Bernstein-Farbwerte |
| `tests/contrast.test.ts` | ändern | neue Tests für Bernstein-Tokens und Tag-Farben |
| `src/lib/tags.ts` | ändern | `text-sage` (Sand-auf-Sand, 1,55:1) durch kontraststarke Farbe ersetzen |
| `src/lib/server/archive.ts` | neu | `addArchivTag` — reine Logik |
| `tests/archive.test.ts` | neu | Tests dazu |
| `src/routes/contacts/+page.server.ts` | ändern | `delete`-Action setzt `archiv`-Tag statt `deleteRecord` |
| `src/routes/companies/+page.server.ts` | ändern | dieselbe Änderung |
| `src/routes/contacts/+page.svelte` | ändern | Archivieren-UI, Filter-Aufklapper, Telefon-Spalte |
| `src/routes/companies/+page.svelte` | ändern | Archivieren-UI, Filter-Aufklapper |
| `src/lib/filter-count.ts` | neu | `activeFilterCount` — reine Logik |
| `tests/filter-count.test.ts` | neu | Tests dazu |
| `src/lib/components/EditableTagChip.svelte` | ändern | Umbenennen-Stift immer sichtbar, größere Trefferfläche |
| `src/lib/components/TimelineItem.svelte` | ändern | Bearbeiten/Löschen immer sichtbar |
| `src/lib/components/ViewTabs.svelte` | ändern | Stift/Papierkorb bei gespeicherten Ansichten größer |

---

### Task 0: Ausgangslage prüfen

**Files:** keine Änderungen.

- [ ] **Step 1: Sauberer Stand**

```bash
cd /Users/felix/Documents/Programmieren/mini-crm
git status --short
npm test 2>&1 | tail -15
```

Erwartet: `git status` zeigt nur die bekannten, unberührten Reste (`static/design/dach.css`, Icons, `static/viewport-check.html`, `.planning/`, `bun.lock`, `docs/superpowers/plans/*.md`) — keine Überraschungen. `npm test`: 81 Tests, 80 grün, 1 übersprungen (Live-Teable-Test), 0 fail. Nicht anfassen, nicht committen — das ist nur die Startprobe.

---

### Task 1: Bernstein-Design-Angleichung

**Files:**
- Modify: `src/app.css` (Block `:root, [data-theme='light-hybrid']`, Zeilen ca. 25–53)
- Modify: `src/lib/tags.ts` (`TAG_COLORS`)
- Modify: `tests/contrast.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `mixOver` aus `src/lib/contrast.ts` (Runde 1).

Befund (Audit UI #1): `app.css` nutzt für das Standard-Theme `#f9f6f2` mit weißen Karten (`#ffffff`) — eine eigene, hellere Cremefarbe statt des echten Bernstein-Tons, den Felix als Standard für Wiki/Berichte festgelegt hat (`#fbf1c7` Grund, `#2a201c` Text, `#904446` Akzent — Henry-CLAUDE.md, Entscheidung 05.09.2026). `--primary`/`--border`/`--accent-sand` bleiben unverändert, weil Runde 1s Kontrast-Tests (`tests/contrast.test.ts`) den Wert `#e6c5a8` fest als „SAND" nutzen und mehrere Komponenten (Toast) exakt darauf kalibriert sind — nur Hintergrund/Karten/Text werden angeglichen.

- [ ] **Step 1: Failing test schreiben**

An `tests/contrast.test.ts` anhängen:

```ts
test('Bernstein-Angleichung: Text #2a201c auf neuem Grund/Karte besteht 4,5:1', () => {
  const BERNSTEIN_BG = '#fbf1c7';
  const BERNSTEIN_CARD = '#f6e9c6';
  const BERNSTEIN_TEXT = '#2a201c';
  assert.ok(contrastRatio(BERNSTEIN_TEXT, BERNSTEIN_BG) >= 4.5);
  assert.ok(contrastRatio(BERNSTEIN_TEXT, BERNSTEIN_CARD) >= 4.5);
});

test('Bernstein-Angleichung: gedämpfter Text #6b5a4e auf neuem Grund/Karte besteht 4,5:1', () => {
  const BERNSTEIN_BG = '#fbf1c7';
  const BERNSTEIN_CARD = '#f6e9c6';
  const BERNSTEIN_TEXT_DIM = '#6b5a4e';
  assert.ok(contrastRatio(BERNSTEIN_TEXT_DIM, BERNSTEIN_BG) >= 4.5);
  assert.ok(contrastRatio(BERNSTEIN_TEXT_DIM, BERNSTEIN_CARD) >= 4.5);
});
```

- [ ] **Step 2: Test laufen lassen, Erfolg sehen**

Run: `node --test tests/contrast.test.ts`
Expected: die zwei neuen Tests PASS (reine Zahlenprobe, unabhängig von `app.css`) — sie legen die Zielwerte fest, bevor `app.css` geändert wird.

- [ ] **Step 3: `app.css` umstellen**

Im Block `:root, [data-theme='light-hybrid']` diese Zeilen ersetzen (Rest des Blocks — `--primary`, `--accent-sand`, `--border`, `--border-bright`, `--destructive`, `--status-*`, `--input`, `--ring` — bleibt **unverändert**):

```css
  --background: #fbf1c7;
  --bg-elevated: #f2e5bc;
  --card: #f6e9c6;
  --card-hover: #eeddb4;
  --card-foreground: #2a201c;
  --foreground: #2a201c;
  --foreground-dim: #6b5a4e;
```

Und weiter unten im selben Block:

```css
  --popover: #f6e9c6;
  --popover-foreground: #2a201c;
  --primary-foreground: #ffffff;
  --secondary: #f2e5bc;
  --secondary-foreground: #904446;
  --muted: #f2e5bc;
  --muted-foreground: #6b5a4e;
  --accent: #f2e5bc;
  --accent-foreground: #904446;
```

- [ ] **Step 4: Sichtprüfung**

Run: `./dev.sh`, Kontaktliste im Standard-Theme (Sidebar-Umschalter zeigt „Hirschfeld Cream") öffnen. Erwartet: warmer Bernstein-Ton statt des vorherigen helleren Creme, Karten heben sich sichtbar vom Grund ab (vorher: weiß auf fast-weiß). Die drei anderen Themes (Dunkel, Neumorphic, Flat) bleiben unverändert — kurz durchklicken, um das zu bestätigen.

- [ ] **Step 5: Tag-Farben — Sand-auf-Sand reparieren**

Befund (Audit UI, Kleinkram): `tagColor()` in `src/lib/tags.ts` nutzt für einen Hash-Bucket `'bg-sage/10 text-sage border-sage/20'` — `--color-sage` zeigt auf `--accent-sand` (`#e6c5a8`), also hellen Sand-Text auf hellem Sand-Hintergrund. Vorher an `tests/contrast.test.ts` anhängen (oben zusätzlich `import { mixOver } from '../src/lib/contrast.ts';` — bereits vorhanden aus Runde 1, nur prüfen):

```ts
test('Tag-Farbe "sage": Text auf 10%-Sand-Hintergrund bestand vorher nicht 4,5:1, jetzt schon', () => {
  const SAGE = '#e6c5a8';
  const CARD = '#ffffff';
  const blended = mixOver(SAGE, CARD, 0.1);
  assert.ok(contrastRatio(SAGE, blended) < 3, 'Beleg: Sand-Text auf Sand-Hintergrund war der Fehler');
  assert.ok(contrastRatio('#2a201c', blended) >= 4.5, 'ink als Tag-Text besteht auf demselben Hintergrund');
});
```

Run: `node --test tests/contrast.test.ts` — Expected: PASS (der Test belegt den alten Fehler und die neue Lösung gleichzeitig).

In `src/lib/tags.ts` die Zeile ersetzen:

```ts
  'bg-sage/10 text-ink border-sage/40',
```

(vorher: `'bg-sage/10 text-sage border-sage/20'`).

- [ ] **Step 6: Sichtprüfung Tags**

Run: `./dev.sh`, Kontaktliste mit mehreren unterschiedlichen Tags öffnen (oder `/companies`), bis ein Tag im „sage"-Bucket erscheint (Hash-basiert, ggf. mehrere Tag-Namen durchprobieren). Erwartet: gut lesbarer dunkler Text statt kaum sichtbarem hellem Text auf hellem Grund.

- [ ] **Step 7: Commit**

```bash
git add src/app.css src/lib/tags.ts tests/contrast.test.ts
git commit -m "fix(design): Standard-Theme auf echtes Bernstein umgestellt, Sand-auf-Sand-Tag-Text repariert" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Löschen → Archivieren

**Files:**
- Create: `src/lib/server/archive.ts`
- Test: `tests/archive.test.ts`
- Modify: `src/routes/contacts/+page.server.ts` (Action `delete`)
- Modify: `src/routes/companies/+page.server.ts` (Action `delete`)
- Modify: `src/routes/contacts/+page.svelte` (Zeilen ca. 253–261, Löschen-Button/-Bestätigung)
- Modify: `src/routes/companies/+page.svelte` (Zeilen ca. 243–251, dieselbe Stelle)

**Interfaces:**
- Produces: `addArchivTag(tags: unknown): string[]` — fügt `'archiv'` hinzu, wenn es fehlt; ist bereits `'archiv'` enthalten, ändert sich nichts; nicht-string-Einträge werden verworfen, nie ein Crash.

Befund (UX #Löschen, Felix' Regel „nie löschen, nur markieren"): `delete` ruft heute `deleteRecord` auf — ein harter Löschvorgang ohne Undo. Das Projekt hat aber schon eine vollständige `archiv`-Tag-Infrastruktur (`src/lib/tags.ts:DEFAULT_TAGS_EXCLUDE`, `src/lib/views.ts:hatArchivUmschalter`, Standard-Listen blenden `archiv` bereits aus, `ViewTabs.svelte` hat schon einen „Aktuell"/„Alle"-Umschalter). Es fehlt nur die letzte Verbindung: die `delete`-Action muss den Tag setzen statt den Datensatz zu löschen.

- [ ] **Step 1: Failing test schreiben**

`tests/archive.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addArchivTag } from '../src/lib/server/archive.ts';

test('fügt archiv-Tag hinzu, wenn er fehlt', () => {
  assert.deepEqual(addArchivTag(['kunde', 'wien']), ['kunde', 'wien', 'archiv']);
});

test('erneutes Archivieren fügt archiv nicht zweimal hinzu', () => {
  assert.deepEqual(addArchivTag(['kunde', 'archiv']), ['kunde', 'archiv']);
});

test('Kontakt ohne Tags bekommt genau [archiv]', () => {
  assert.deepEqual(addArchivTag(undefined), ['archiv']);
  assert.deepEqual(addArchivTag(null), ['archiv']);
  assert.deepEqual(addArchivTag([]), ['archiv']);
});

test('nicht-string-Einträge aus Teable werden verworfen, kein Crash', () => {
  assert.deepEqual(addArchivTag(['kunde', 42, null, undefined]), ['kunde', 'archiv']);
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/archive.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Modul schreiben**

`src/lib/server/archive.ts`:

```ts
/** Fügt 'archiv' hinzu, wenn nicht schon vorhanden. Nutzt die bestehende archiv-Tag-Infrastruktur (DEFAULT_TAGS_EXCLUDE, hatArchivUmschalter) statt eines eigenen Felds. */
export function addArchivTag(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
  return list.includes('archiv') ? list : [...list, 'archiv'];
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/archive.test.ts`
Expected: 4 Tests PASS.

- [ ] **Step 5: `contacts/+page.server.ts` umstellen**

Import ergänzen (bei den bestehenden `$lib`-Importen):

```ts
import { addArchivTag } from '$lib/server/archive';
```

`getRecord` zum bestehenden Import aus `$lib/server/teable` ergänzen (Zeile 1 wird zu):

```ts
import { listRecords, createRecord, updateRecord, deleteRecord, getRecord, linkId } from '$lib/server/teable';
```

Die Action `delete` ersetzen:

```ts
  delete: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id');
    if (!isRecordId(id)) return fail(400, { error: 'Ungültige ID' });
    const record = await getRecord<Record<string, unknown>>(TABLES.kontakteReal, id);
    const tags = addArchivTag(record?.fields[KONTAKTE_FIELDS.tags]);
    await updateRecord(TABLES.kontakteReal, id, { [KONTAKTE_FIELDS.tags]: tags });
    return { success: true };
  },
```

`deleteRecord` bleibt importiert, aber ab jetzt in dieser Datei ungenutzt — das ist beabsichtigt (kein totes Löschen mehr über die UI), TypeScript meldet unbenutzte Importe hier nicht als Fehler (`deleteRecord` wird evtl. anderswo noch gebraucht; falls `tsc` einen `noUnusedLocals`-Fehler wirft, den Import auf `updateRecord, getRecord, linkId` kürzen).

- [ ] **Step 6: `companies/+page.server.ts` umstellen**

Dieselben zwei Importe ergänzen (`addArchivTag`, `getRecord` zu `$lib/server/teable`), dann die Action `delete`:

```ts
  delete: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id');
    if (!isRecordId(id)) return fail(400, { error: 'Ungültige ID' });
    const record = await getRecord<Record<string, unknown>>(TABLES.firmen, id);
    const tags = addArchivTag(record?.fields[FIRMEN_FIELDS.tags]);
    await updateRecord(TABLES.firmen, id, { [FIRMEN_FIELDS.tags]: tags });
    return { success: true };
  },
```

- [ ] **Step 7: `contacts/+page.svelte` — UI von Löschen auf Archivieren**

Import ergänzen (bei den `@lucide/svelte/icons`-Importen):

```ts
  import Archive from '@lucide/svelte/icons/archive';
```

Den Bestätigungs-Block ersetzen (aktuell: `{#if deleteConfirm === contact.id} … {:else} …Trash2… {/if}`):

```svelte
        {#if deleteConfirm === contact.id}
          <form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => {
            if (result.type === 'success') toast.success('Kontakt archiviert'); else toast.error('Fehler');
            deleteConfirm = null; await update();
          }} class="flex items-center gap-1">
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" class="px-2 py-1 bg-ink text-white rounded text-xs">Ja</button>
            <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
          </form>
        {:else}
          <button onclick={() => (deleteConfirm = contact.id)} class="p-1.5 text-ink-soft hover:text-terracotta transition-colors rounded" title="Archivieren">
            <Archive class="w-3.5 h-3.5" />
          </button>
        {/if}
```

- [ ] **Step 8: `companies/+page.svelte` — dieselbe Umstellung**

Import `Archive` ergänzen, den Block ersetzen:

```svelte
          {#if deleteConfirm === company.id}
            <form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Firma archiviert'); deleteConfirm = null; await update(); }} class="flex items-center gap-1">
              <input type="hidden" name="id" value={company.id} />
              <button type="submit" class="px-2 py-1 bg-ink text-white rounded text-xs">Ja</button>
              <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
            </form>
          {:else}
            <button onclick={() => (deleteConfirm = company.id)} class="p-1.5 text-ink-soft hover:text-terracotta transition-colors rounded" title="Archivieren">
              <Archive class="w-3.5 h-3.5" />
            </button>
          {/if}
```

- [ ] **Step 9: Von Hand prüfen**

Run: `./dev.sh`. Einen Test-Kontakt archivieren (Archiv-Symbol → Ja). Erwartet: verschwindet sofort aus der „Aktuell"-Liste, Toast „Kontakt archiviert". `ViewTabs` auf „Alle" umschalten: der Kontakt taucht wieder auf, mit Tag `archiv`. Denselben Kontakt danach in Teable oder über die Tag-Bearbeitung am Kontakt wieder entfernen (Tag `archiv` löschen), um den Testdatensatz zurückzuholen — Felix entscheidet, ob der Testkontakt bleibt oder entfernt wird.

- [ ] **Step 10: Commit**

```bash
git add src/lib/server/archive.ts tests/archive.test.ts src/routes/contacts/+page.server.ts src/routes/companies/+page.server.ts src/routes/contacts/+page.svelte src/routes/companies/+page.svelte
git commit -m "fix(ux): Löschen archiviert jetzt (archiv-Tag) statt hart zu löschen" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Filter-Ruhe — Suche + Aufklapper

**Files:**
- Create: `src/lib/filter-count.ts`
- Test: `tests/filter-count.test.ts`
- Modify: `src/routes/contacts/+page.svelte` (Filterleiste, Zeilen ca. 289–339)
- Modify: `src/routes/companies/+page.svelte` (Filterleiste, analoge Stelle ab Zeile ca. 273)

**Interfaces:**
- Produces: `activeFilterCount(input: { tags: string[]; tagsExclude: string[]; ort: string; group: string }): number`.

Befund (UX #Filterlärm): sieben oder mehr Filterentscheidungen stehen heute offen vor der Liste (Suche, Tags einschließen, Tags ausschließen, Sortieren, Gruppieren, Ort, UND/ODER). Felix' Entscheidung 23.09.2026: nur Suche + Ansichten-Tabs bleiben immer sichtbar, der Rest hinter einem Aufklapper „Filter" mit Zähler-Badge, der offen startet, wenn beim Laden schon Filter aktiv sind.

- [ ] **Step 1: Failing test schreiben**

`tests/filter-count.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeFilterCount } from '../src/lib/filter-count.ts';

const LEER = { tags: [], tagsExclude: [], ort: '', group: '' };

test('ohne Filter ist die Anzahl 0', () => {
  assert.equal(activeFilterCount(LEER), 0);
});

test('ausgewählte und ausgeschlossene Tags zählen einzeln', () => {
  assert.equal(activeFilterCount({ ...LEER, tags: ['a', 'b'], tagsExclude: ['c'] }), 3);
});

test('Ort und Gruppierung zählen je 1, unabhängig vom Wert', () => {
  assert.equal(activeFilterCount({ ...LEER, ort: 'Wien' }), 1);
  assert.equal(activeFilterCount({ ...LEER, group: 'tags' }), 1);
  assert.equal(activeFilterCount({ ...LEER, ort: 'Wien', group: 'tags' }), 2);
});

test('alles zusammen summiert sich', () => {
  assert.equal(activeFilterCount({ tags: ['a'], tagsExclude: ['b', 'c'], ort: 'Wien', group: 'tags' }), 5);
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `node --test tests/filter-count.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Modul schreiben**

`src/lib/filter-count.ts`:

```ts
/** Zählt aktive Filter für das Badge am Aufklapper "Filter". Sortierung zählt bewusst nicht mit — sie hat immer einen Wert und ist kein Ausschluss-Filter. */
export function activeFilterCount(input: {
  tags: string[];
  tagsExclude: string[];
  ort: string;
  group: string;
}): number {
  return input.tags.length + input.tagsExclude.length + (input.ort ? 1 : 0) + (input.group ? 1 : 0);
}
```

- [ ] **Step 4: Erfolg sehen**

Run: `node --test tests/filter-count.test.ts`
Expected: 4 Tests PASS.

- [ ] **Step 5: `contacts/+page.svelte` — Aufklapper einbauen**

Import ergänzen:

```ts
  import { activeFilterCount } from '$lib/filter-count';
```

`ChevronDown` ist in dieser Datei schon importiert (Zeile 23, für die Gruppen-Aufklappzeichen) — nicht doppelt importieren, direkt weiterverwenden.

Nach den bestehenden `$derived`-Deklarationen (nahe `hasTagFilter`) ergänzen:

```ts
  let filterCount = $derived(activeFilterCount({ tags: selectedTags, tagsExclude: excludedTags, ort, group }));
  let filterOpen = $state(activeFilterCount({ tags: selectedTags, tagsExclude: excludedTags, ort, group }) > 0);
```

Die bestehende „Schlanke Filterleiste"-`<div>` umbauen: direkt nach der `<p>„🔍 Live-Suche"</p>`-Zeile und dem Such-`<input>`-Block (bleibt unverändert, immer sichtbar) einen Umschalter einfügen, und den restlichen Inhalt (Tags-Block + Sortieren/Gruppieren/Ort-Zeile) in `{#if filterOpen}` einpacken:

```svelte
  <div class="bg-surface rounded-xl border border-line p-3 mb-3">
    <div class="flex items-start gap-3">
      <div class="flex-1">
        <p class="text-[11px] font-bold text-ink-soft uppercase tracking-wide mb-1">🔍 Live-Suche</p>
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-soft" />
          <input type="text" bind:value={searchValue} oninput={handleSearch} placeholder="Name, Firma oder Rolle…"
            class="w-full pl-8 pr-3 py-1 bg-cream border border-line rounded-lg text-xs text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
      </div>
      <button type="button" onclick={() => (filterOpen = !filterOpen)}
        class="flex items-center gap-1 px-2.5 py-1.5 mt-4 border border-line rounded-lg text-xs text-ink-soft hover:text-ink hover:border-ink/30 transition-colors">
        Filter
        {#if filterCount > 0}
          <span class="px-1.5 py-0.5 rounded-full bg-terracotta text-white text-[10px] font-bold">{filterCount}</span>
        {/if}
        <ChevronDown class="w-3.5 h-3.5 transition-transform {filterOpen ? 'rotate-180' : ''}" />
      </button>
    </div>

    {#if filterOpen}
      <div class="mt-3 pt-3 border-t border-line">
        <!-- HIER: der bisherige Tags-Block (🏷 Tags Mehrfachauswahl + 🚫 Tags ausschließen) unverändert einfügen -->
        <!-- HIER: die bisherige Sortieren/Gruppieren/Ort/UND-ODER/Filter-löschen-Zeile unverändert einfügen -->
      </div>
    {/if}
  </div>
```

Konkret: den bestehenden `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">…Tags…</div>` (ohne den Live-Suche-Teil, der ist jetzt oben) und die bestehende `<div class="mt-2 pt-2 border-t border-line flex flex-wrap …">…Sortieren…</div>` unverändert in den `{#if filterOpen}`-Block verschieben — nur verschieben, keine Logik ändern.

- [ ] **Step 6: `companies/+page.svelte` — dieselbe Umstellung**

Analog: `activeFilterCount` importieren (`ChevronDown` ist auch hier schon vorhanden, Zeile 25), `filterCount`/`filterOpen` mit denselben vier Werten (`tags`, `tagsExclude`, `ort`, `group` — `companies/+page.svelte:69` hat wie `contacts` ein eigenes `let ort = $state(data.ort ?? '')`, also 1:1 dieselbe Struktur), denselben Umschalter-Button, denselben Aufbau (Suche immer sichtbar, Tags + Sortieren/Gruppieren hinter `{#if filterOpen}`).

- [ ] **Step 7: Von Hand prüfen**

Run: `./dev.sh`, `/contacts` ohne Filter öffnen: Filterleiste zeigt nur Suchfeld + „Filter"-Knopf ohne Badge, kollabiert. Einen Tag-Filter über eine gespeicherte Ansicht laden (oder URL `?tags=irgendein-tag`): Aufklapper startet offen, Badge zeigt die Anzahl. Knopf klicken: klappt zu/auf, Zustand bleibt beim Filtern erhalten. Dasselbe auf `/companies`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/filter-count.ts tests/filter-count.test.ts src/routes/contacts/+page.svelte src/routes/companies/+page.svelte
git commit -m "fix(ux): Filterleiste beruhigt — Suche immer sichtbar, Rest hinter Aufklapper mit Zähler" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Handy — Bedienelemente ohne Hover sichtbar machen

**Files:**
- Modify: `src/lib/components/EditableTagChip.svelte:114`
- Modify: `src/lib/components/TimelineItem.svelte:172,188`
- Modify: `src/lib/components/ViewTabs.svelte:133-137`

Befund (UI „Handy: Hover-Knöpfe unsichtbar"): drei Stellen zeigen Bedienelemente nur bei `:hover`-Auslösung durch `opacity-0 group-hover:opacity-100` bzw. `opacity-0 pointer-events-none group-hover/chip:opacity-100` — auf einem Touchscreen gibt es kein verlässliches Hover, die Elemente bleiben unerreichbar. Dazu sind zwei der drei Trefferflächen mit `w-2.5 h-2.5`/`w-4 h-4` Icon-Größe plus `p-0.5`/keinem Padding weit unter einer bedienbaren Mindestgröße.

- [ ] **Step 1: `EditableTagChip.svelte` — Umbenennen-Stift**

Zeile 114 (der Stift-Button) ersetzen:

```svelte
    <button
      type="button"
      onclick={startEdit}
      title="Tag umbenennen"
      class="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center opacity-70 hover:opacity-100 hover:border-terracotta hover:text-terracotta text-ink-soft transition-opacity"
    >
      <Pencil class="w-3 h-3" />
    </button>
```

(vorher: `w-4 h-4`, `opacity-0 pointer-events-none group-hover/chip:opacity-100 group-hover/chip:pointer-events-auto` — jetzt immer sichtbar mit `opacity-70`, `pointer-events` nicht mehr eingeschränkt, keine `pointer-events-none`/`-auto`-Umschaltung mehr nötig.)

- [ ] **Step 2: `TimelineItem.svelte` — Bearbeiten/Löschen an Einträgen**

Beide Stellen (Zeile 172 und 188) von

```
opacity-0 group-hover:opacity-100
```

auf

```
opacity-60 hover:opacity-100
```

ändern (Klassen-String jeweils direkt ersetzen, restliche Klassen unverändert lassen).

- [ ] **Step 3: `ViewTabs.svelte` — Stift/Papierkorb bei gespeicherten Ansichten**

Zeilen 133–137 ersetzen:

```svelte
          <button type="button" title="Umbenennen" onclick={() => { renaming = view.id; renameValue = view.name; }} class="p-1.5 text-ink-soft hover:text-terracotta transition-colors rounded">
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Löschen" onclick={() => (deleteConfirm = view.id)} class="p-1.5 text-ink-soft hover:text-red-500 transition-colors rounded">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
```

(vorher: `p-0.5` + `w-2.5 h-2.5` — jetzt dieselbe Größe wie die Aktions-Icons in den Kontakt-/Firmenlisten, `p-1.5` + `w-3.5 h-3.5`.)

- [ ] **Step 4: Von Hand prüfen**

Am Handy (oder im Browser-DevTools-Touch-Emulator, `./dev.sh`): Tag-Chip in der Filterleiste antippen — der Umbenennen-Stift ist sichtbar, ohne vorher etwas berührt zu haben. Eine Interaktion in der Kontakt-Timeline öffnen — Bearbeiten/Löschen sind sichtbar, nicht erst nach Hover. Eine gespeicherte Ansicht in `ViewTabs` — Stift/Papierkorb sind größer und gut treffbar.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/EditableTagChip.svelte src/lib/components/TimelineItem.svelte src/lib/components/ViewTabs.svelte
git commit -m "fix(mobile): hover-versteckte Bedienelemente immer sichtbar, größere Trefferflächen" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Telefonnummer-Umbruch auf dem Handy (Entscheidung 3d)

**Files:**
- Modify: `src/routes/contacts/+page.svelte` (Tabellen-Header ca. Zeile 417–420, Zeile mit dem Telefon-Quickdial ca. Zeile 244–248)

Befund (Felix, 22.09.2026, live beobachtet): in der Kontaktliste steckt der Telefon-Schnellwahl-Button (`📞 {contact.telefon}`, `whitespace-nowrap`) zusammen mit Bearbeiten- und Archivieren-Icon in einer **festen** 76px-Spalte (`table-fixed` + `w-[76px]`) — auf dem Handy sind „Rolle", „Tags" und „Letzte Info" per `hidden md/lg:table-cell` schon ausgeblendet, die Telefonnummer hat in den verbliebenen 76px keinen Platz und bricht hässlich um. Deckt sich mit dem UI-Audit-Befund „Aktionsspalte zu schmal, 76px statt ~200px nötig". Fix: Telefon bekommt eine eigene, schmale, immer sichtbare Spalte (nur Icon als `tel:`-Link), die Aktionsspalte bleibt für Bearbeiten + Archivieren.

- [ ] **Step 1: Neue Telefon-Spalte im Tabellen-Header**

In der `<thead>`-Zeile (aktuell endet sie mit der Aktion-Spalte) direkt **vor** `<th class="px-3 py-2 text-right text-xs font-medium text-ink-soft w-[76px]">Aktion</th>` einfügen:

```svelte
                <th class="px-3 py-2 text-right text-xs font-medium text-ink-soft w-11"><span class="sr-only">Telefon</span></th>
```

- [ ] **Step 2: Telefon aus der Aktionsspalte in die neue Spalte verschieben**

Im `contactRow`-Snippet den bestehenden Block

```svelte
        {#if contact.telefon}
          <a href="tel:{contact.telefon}" class="px-2 py-1 border border-line rounded text-xs font-mono font-bold text-terracotta hover:bg-cream transition-colors whitespace-nowrap">
            📞 {contact.telefon}
          </a>
        {/if}
```

aus der Aktions-`<td>` **entfernen** und stattdessen eine eigene `<td>` **vor** der Aktions-`<td>` einfügen:

```svelte
    <td class="px-3 py-2 text-right">
      {#if contact.telefon}
        <a href="tel:{contact.telefon}" title={contact.telefon} class="inline-flex items-center justify-center w-7 h-7 rounded-full text-terracotta hover:bg-cream transition-colors">
          <Phone class="w-3.5 h-3.5" />
        </a>
      {/if}
    </td>
```

`Phone`-Icon ist in dieser Datei schon importiert (Zeile 18) — kein neuer Import nötig.

- [ ] **Step 3: Aktionsspalte schmaler**

`w-[76px]` am Aktion-`<th>` auf `w-16` ändern (64px reichen jetzt für zwei Icon-Buttons ohne Telefonnummer).

- [ ] **Step 4: Von Hand prüfen**

Run: `./dev.sh`, Browser-Fenster auf Handy-Breite (z. B. 375px) verkleinern, `/contacts` öffnen. Erwartet: Telefon-Symbol steht in eigener schmaler Spalte, kein Umbruch/Overflow mehr, Bearbeiten/Archivieren bleiben daneben bedienbar. Antippen des Telefon-Symbols öffnet den Anruf-Dialog (`tel:`-Link).

- [ ] **Step 5: Commit**

```bash
git add src/routes/contacts/+page.svelte
git commit -m "fix(mobile): Telefon bekommt eigene Spalte statt in der Aktionsspalte umzubrechen" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Abschluss der Runde

- [ ] **Step 1: Alle Tests**

Run: `npm test`
Expected: alle grün (81 vorherige + 6 Kontrast/Bernstein + 4 Archiv + 4 Filter-Count neue = 95), Integrationstest weiterhin übersprungen, 0 fail.

- [ ] **Step 2: Build läuft durch**

```bash
set -a; . ./.env; set +a
npm run build 2>&1 | tail -8
```

Expected: Build endet ohne Fehler.

- [ ] **Step 3: Sichtabnahme mit Felix**

`./dev.sh` starten und zeigen: Bernstein-Ton im Standard-Theme, lesbare Tag-Farbe im „sage"-Bucket, Filterleiste kollabiert mit Badge, Archivieren statt Löschen (inkl. „Alle"-Ansicht zeigt es wieder), Handy-Breite: sichtbare Bearbeiten/Archivieren-Icons ohne Hover, Telefon-Spalte ohne Umbruch. `/qa` bietet sich hier an.

- [ ] **Step 4: Freigabe abwarten**

**Kein Push, kein Deploy**, bis Felix „push das"/„deploy das" sagt.

- [ ] **Step 5: Dokumentation**

Werkbank (`Henry/modules/werkbank/crm/`: `thema.json` + `protokoll.md`, danach `python3 scripts/werkbank_render.py`), `data/work-log.json`, Ein-Satz-Changelog: „CRM Runde 3: Bernstein-Design, ruhigere Filterleiste, Archivieren statt Löschen, drei Handy-Bugfixes."

## Self-Review (gegen Audit + Felix' Entscheidungen 23.09.2026)

- Bernstein-Angleichung (UI #1, „nicht im Bernstein-Design"): Task 1. ✔
- Sand-auf-Sand-Tag-Text (UI Kleinkram): Task 1 Step 5. ✔
- 3a (Löschen → archivieren, archiv-Tag statt neues Feld): Task 2. ✔
- 3c (Suche + ein Aufklapper „Filter"): Task 3. ✔
- 3b (Startansicht bleibt Kontaktliste): kein Task nötig, bewusst nicht angefasst. ✔
- „Handy: Hover-Knöpfe unsichtbar" (UI): Task 4. ✔
- „Aktionsspalte zu schmal" (UI) + 3d (Telefonnummern-Umbruch, Felix 22.09.2026): Task 5 — beide Befunde sind derselbe Bug, in einem Task behoben. ✔
- 3e (Tag-Management) und „Nächster Schritt"-Feld: **bewusst nicht** in dieser Runde (Felix' Entscheidung 23.09.2026, „nur der Kern") — kein Task, keine Vorbereitung, damit der Umfang nicht heimlich wächst.
- Typkonsistenz: `addArchivTag` (Task 2, gleiche Signatur in beiden Server-Dateien), `activeFilterCount` (Task 3, gleiche vier Felder in beiden Svelte-Dateien), `contrastRatio`/`mixOver` (Task 1, aus Runde 1 wiederverwendet, keine neue Kontrast-Logik erfunden).
