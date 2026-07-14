# Kontakte/Firmen: Filter, Sortierung, Gruppierung, gespeicherte Ansichten — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kontakte und Firmen bekommen Tag+Ort-Filter, Sortierung, Gruppierung nach Tags und geräteübergreifend gespeicherte Ansichten als Tabs.

**Architecture:** URL-Parameter-getriebener Filter/Sort/Group-Zustand (wie schon bei Kontakte), gespeicherte Ansichten als Teable-Records, geteilte pure-Logik-Module (`$lib/tags.ts`, `$lib/server/contact-filters.ts`, `$lib/server/company-filters.ts`) für Testbarkeit, geteilte UI-Komponenten (`TagInput.svelte`, `ViewTabs.svelte`) für Firmen und Kontakte, Rest bleibt pro Route eigenständig.

**Tech Stack:** SvelteKit 2 / Svelte 5 (Runes), TypeScript, Tailwind, Teable REST API (kein ORM), Node 22 (`--experimental-strip-types --test` als Test-Runner, kein Framework installiert).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-14-kontakte-firmen-filter-views-design.md` (dieses Repo).
- Kein Test-Framework installiert. Pure-Logik-Module bekommen Unit-Tests via Node-Bordmitteln: `node --experimental-strip-types --test tests/<datei>.test.ts` (verifiziert lauffähig, Node v22.21.1). UI/Routen-Verdrahtung wird manuell via `npm run build` + `npm run dev` + echtem Teable-Round-Trip geprüft (kein Playwright/Vitest-Setup neu einführen — nicht gefordert, YAGNI).
- Zwei Repos sind betroffen: **mini-crm** (`/Users/felix/Documents/Programmieren/mini-crm`, alle Tasks außer Schema-Skript) und **Henry** (`/Users/felix/Documents/Henry`, nur Task 2 — Teable-Schema-Skripte leben dort, siehe `scripts/create_crm_teable_schema.py`-Präzedenzfall).
- Kein Deploy als Teil dieses Plans. Nur lokal bauen/testen. Deploy erst nach explizitem Zuruf von Felix (`./deploy.sh`).
- Bestehender Codestil: deutsche UI-Texte, Tailwind-Utility-Klassen mit den vorhandenen Design-Tokens (`terracotta`, `sage`, `cream`, `ink`, `line`, `surface`), Svelte-5-Runes (`$state`/`$derived`/`$props`/`$bindable`), SvelteKit-Form-Actions + `use:enhance` für an eine Route-Action gebundene Mutationen, `fetch()` gegen eine `/api/*`-Route für seitenübergreifende Aktionen (Präzedenzfall: `/api/contacts/[id]/photo`).
- Teable-Requests laufen ausschließlich über `src/lib/server/teable.ts` (`listRecords`/`createRecord`/`updateRecord`/`deleteRecord`) mit `fieldKeyType=name` — nie direkt `fetch` gegen die Teable-API in Anwendungscode.
- Round-Trip-Tests gegen echtes Teable müssen angelegte Testdaten in derselben Verifikation wieder löschen — Teable muss danach im Originalzustand sein.
- Task 14 ist unabhängig vom Rest dieses Plans (separates Thema: Interaktionen_Real-Konsistenz) und **rein diagnostisch** — keine Code-/Datenänderung ohne Rücksprache mit Felix.

---

### Task 1: `dev.sh` bereinigen (toter Postgres-Tunnel raus)

**Files:**
- Modify: `dev.sh`

**Interfaces:** keine (Shell-Skript, kein Code-Interface).

- [ ] **Step 1: `dev.sh` neu schreiben**

```bash
#!/bin/bash
# Lokale Entwicklung — startet den Vite-Dev-Server.
# Der SSH-Tunnel zur alten Postgres-DB ist seit der Teable-Migration nicht
# mehr nötig (mini-crm spricht direkt mit teable.hirschfeld.at). Vite lädt
# .env im Dev-Modus automatisch.
# Usage: ./dev.sh

npm run dev
```

- [ ] **Step 2: Verifizieren, dass der Dev-Server ohne Tunnel hochkommt**

Run: `npm run dev -- --port 5183 &` warten bis „Local: http://localhost:5183/" erscheint, dann `curl -s -o /dev/null -w "%{http_code}" http://localhost:5183/contacts`
Expected: `200`
Danach den Dev-Server-Prozess wieder beenden (`kill %1` oder den PID aus dem Hintergrundjob).

- [ ] **Step 3: Commit**

```bash
git add dev.sh
git commit -m "chore: dev.sh — toten Postgres-SSH-Tunnel entfernen (Teable-Migration ist abgeschlossen)"
```

---

### Task 2: Teable-Schema erweitern — Firmen.Tags + Gespeicherte_Ansichten

**Files:**
- Create: `/Users/felix/Documents/Henry/scripts/add_firmen_tags_und_ansichten.py`
- Modify: `src/lib/server/teable-schema.ts` (mini-crm)

**Interfaces:**
- Produces: `TABLES.ansichten: string`, `FIRMEN_FIELDS.tags: 'Tags'`, `ANSICHTEN_FIELDS: { name, seite, filter, erstelltAm }` — von allen späteren Tasks referenziert.

- [ ] **Step 1: Skript schreiben (Henry-Repo)**

```python
#!/usr/bin/env python3
"""
Erweitert das mini-crm-Teable-Schema in base felix_base:
  1. Neues Feld "Tags" (multipleSelect) auf Tabelle Firmen (tbl58ahoWar7wVxWHjA)
  2. Neue Tabelle "Gespeicherte_Ansichten" (Name, Seite, Filter, Erstellt am)

Teil von: mini-crm Filter/Sortierung/Gruppierung/gespeicherte-Ansichten-Feature
(docs/superpowers/specs/2026-07-14-kontakte-firmen-filter-views-design.md im
mini-crm-Repo).

USAGE
  python3 scripts/add_firmen_tags_und_ansichten.py            # trocken
  python3 scripts/add_firmen_tags_und_ansichten.py --commit   # legt wirklich an

Liest TEABLE_API_KEY / TEABLE_BASE_URL aus .env (Projekt-Root, Henry-Repo).
"""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # .../Henry
FELIX_BASE = "bseJqfV4E4Ri1QYjUUL"
FIRMEN_TABLE_ID = "tbl58ahoWar7wVxWHjA"


def load_env():
    env_path = ROOT / ".env"
    env = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def teable_request(base, key, path, method="GET", body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{base}/api{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {key}",
            "User-Agent": "curl/8",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()[:500]}")


def add_field(base, key, table_id, field_body, dry_run):
    if dry_run:
        print(f"[dry-run] wuerde Feld anlegen auf {table_id}: {field_body['name']}")
        return {"id": f"DRY_{table_id}_{field_body['name']}"}
    result = teable_request(base, key, f"/table/{table_id}/field", method="POST", body=field_body)
    print(f"  Feld '{field_body['name']}' angelegt: {result['id']}")
    return result


def create_table(base, key, name, fields, dry_run):
    body = {"name": name, "fields": fields}
    if dry_run:
        print(f"[dry-run] wuerde Tabelle anlegen: {name} ({len(fields)} Felder)")
        return {"id": f"DRY_{name}", "fields": [{"id": f"DRY_{name}_{f['name']}", **f} for f in fields]}
    result = teable_request(base, key, f"/base/{FELIX_BASE}/table", method="POST", body=body)
    print(f"Tabelle '{name}' angelegt: {result['id']}")
    return result


def field_id_by_name(table_result, name):
    for f in table_result.get("fields", []):
        if f["name"] == name:
            return f["id"]
    raise RuntimeError(f"Feld '{name}' nicht in Tabellen-Response gefunden")


def main():
    dry_run = "--commit" not in sys.argv
    env = load_env()
    base = env.get("TEABLE_BASE_URL", "https://teable.hirschfeld.at")
    key = env.get("TEABLE_API_KEY")
    if not key:
        print("FEHLER: TEABLE_API_KEY fehlt in .env", file=sys.stderr)
        sys.exit(1)

    if dry_run:
        print("=== DRY RUN — nichts wird angelegt (--commit fuer echten Lauf) ===\n")

    print("1. Feld 'Tags' auf Firmen anlegen...")
    tags_field = add_field(
        base, key, FIRMEN_TABLE_ID,
        {"name": "Tags", "type": "multipleSelect", "options": {"choices": []}},
        dry_run,
    )

    print("\n2. Tabelle 'Gespeicherte_Ansichten' anlegen...")
    ansichten = create_table(
        base, key, "Gespeicherte_Ansichten",
        [
            {"name": "Name", "type": "singleLineText"},
            {
                "name": "Seite", "type": "singleSelect",
                "options": {"choices": [{"name": "kontakte"}, {"name": "firmen"}]},
            },
            {"name": "Filter", "type": "longText"},
            {
                "name": "Erstellt am", "type": "date",
                "options": {"formatting": {"date": "DD.MM.YYYY", "time": "HH:mm", "timeZone": "Europe/Vienna"}},
            },
        ],
        dry_run,
    )

    ids = {
        "firmen_tags_field_id": tags_field["id"],
        "ansichten_table_id": ansichten["id"],
        "ansichten_name_field_id": field_id_by_name(ansichten, "Name"),
        "ansichten_seite_field_id": field_id_by_name(ansichten, "Seite"),
        "ansichten_filter_field_id": field_id_by_name(ansichten, "Filter"),
        "ansichten_erstellt_am_field_id": field_id_by_name(ansichten, "Erstellt am"),
    }
    out_path = ROOT / "scripts" / "add_firmen_tags_und_ansichten_ids.json"
    out_path.write_text(json.dumps(ids, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nIDs geschrieben nach {out_path}")
    print(json.dumps(ids, indent=2, ensure_ascii=False))

    if dry_run:
        print("\n--commit anhaengen fuer echten Lauf.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Dry-Run**

Run (im Henry-Repo): `cd /Users/felix/Documents/Henry && python3 scripts/add_firmen_tags_und_ansichten.py`
Expected: zwei `[dry-run]`-Zeilen (Feld „Tags" auf Firmen, Tabelle „Gespeicherte_Ansichten"), kein Fehler, keine echte Teable-Änderung.

- [ ] **Step 3: Echten Lauf ausführen**

Run: `python3 scripts/add_firmen_tags_und_ansichten.py --commit`
Expected: „Feld 'Tags' angelegt: fldXXXXXXXX", „Tabelle 'Gespeicherte_Ansichten' angelegt: tblXXXXXXXX", JSON mit allen IDs wird ausgegeben und nach `scripts/add_firmen_tags_und_ansichten_ids.json` geschrieben.

- [ ] **Step 4: IDs in `teable-schema.ts` eintragen (mini-crm-Repo)**

`scripts/add_firmen_tags_und_ansichten_ids.json` öffnen, `ansichten_table_id` entnehmen. In `src/lib/server/teable-schema.ts`:

```ts
export const TABLES = {
  firmen: 'tbl58ahoWar7wVxWHjA',
  kontakteReal: 'tblnTqgSMBRZLWINOp6',
  interaktionenReal: 'tblNE3WqZkqafOGS9f1',
  aufgabenReal: 'tblZBgkRKvvVeckzZaP',
  prospects: 'tbl6LjxihnKhe0I5A1L',
  ansichten: '<ansichten_table_id aus Step 3>'
} as const;

export const FIRMEN_FIELDS = {
  name: 'Name',
  website: 'Website',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
  notizen: 'Notizen',
  tags: 'Tags'
} as const;
```

Direkt nach dem `PROSPECT_FIELDS`-Export ergänzen:

```ts
export const ANSICHTEN_FIELDS = {
  name: 'Name',
  seite: 'Seite',
  filter: 'Filter',
  erstelltAm: 'Erstellt am'
} as const;
```

- [ ] **Step 5: Beide Repos committen**

```bash
cd /Users/felix/Documents/Henry
git add scripts/add_firmen_tags_und_ansichten.py scripts/add_firmen_tags_und_ansichten_ids.json
git commit -m "feat(marketing/crm): Teable-Schema um Firmen.Tags + Gespeicherte_Ansichten erweitern"

cd /Users/felix/Documents/Programmieren/mini-crm
git add src/lib/server/teable-schema.ts
git commit -m "feat: Teable-Schema-IDs für Firmen.Tags + Gespeicherte_Ansichten eintragen"
```

---

### Task 3: `$lib/tags.ts` — Tag-Farben + Gruppierungslogik

**Files:**
- Create: `src/lib/tags.ts`
- Test: `tests/tags.test.ts`

**Interfaces:**
- Produces: `tagColor(tag: string): string`, `groupByTags<T>(items: T[], tagsOf: (item: T) => string[]): TagGroup<T>[]` mit `type TagGroup<T> = { tag: string; items: T[] }` — genutzt von Task 5, 10, 12.

- [ ] **Step 1: Failing Test schreiben**

`tests/tags.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagColor, groupByTags } from '../src/lib/tags.ts';

test('tagColor: gleicher Tag ergibt immer dieselbe Klasse', () => {
  assert.equal(tagColor('felix'), tagColor('felix'));
});

test('tagColor: gibt eine nicht-leere CSS-Klassen-Kette zurück', () => {
  assert.match(tagColor('steuerberater'), /bg-/);
});

test('groupByTags: Item mit mehreren Tags erscheint in jeder passenden Gruppe', () => {
  const items = [{ id: 1, tags: ['felix', 'steuerberater'] }];
  const groups = groupByTags(items, (i) => i.tags);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((g) => g.items[0].id === 1));
});

test('groupByTags: Items ohne Tags landen in "Ohne Tags" am Ende', () => {
  const items = [
    { id: 1, tags: ['a'] },
    { id: 2, tags: [] }
  ];
  const groups = groupByTags(items, (i) => i.tags);
  assert.equal(groups[groups.length - 1].tag, 'Ohne Tags');
  assert.deepEqual(groups[groups.length - 1].items.map((i) => i.id), [2]);
});

test('groupByTags: Tag-Gruppen sind alphabetisch sortiert', () => {
  const items = [
    { id: 1, tags: ['zeta'] },
    { id: 2, tags: ['alpha'] }
  ];
  const groups = groupByTags(items, (i) => i.tags);
  assert.deepEqual(groups.map((g) => g.tag), ['alpha', 'zeta']);
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen (Modul existiert nicht)**

Run: `node --experimental-strip-types --test tests/tags.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/tags.ts'`

- [ ] **Step 3: `src/lib/tags.ts` implementieren**

```ts
// src/lib/tags.ts
// Geteilte Tag-Farb-Hash-Funktion + Tag-basierte Gruppierung, genutzt von
// Kontakten und Firmen.

const TAG_COLORS = [
  'bg-terracotta/10 text-terracotta border-terracotta/20',
  'bg-sage/10 text-sage border-sage/20',
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200'
];

export function tagColor(tag: string): string {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export type TagGroup<T> = { tag: string; items: T[] };

/**
 * Ein Item mit mehreren Tags erscheint in jeder passenden Gruppe (Dopplung
 * gewollt). Items ohne Tags landen in einer eigenen Gruppe "Ohne Tags" am
 * Ende. Tag-Gruppen sind alphabetisch sortiert.
 */
export function groupByTags<T>(items: T[], tagsOf: (item: T) => string[]): TagGroup<T>[] {
  const byTag = new Map<string, T[]>();
  const untagged: T[] = [];

  for (const item of items) {
    const tags = tagsOf(item);
    if (tags.length === 0) {
      untagged.push(item);
      continue;
    }
    for (const tag of tags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(item);
    }
  }

  const groups: TagGroup<T>[] = [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, groupItems]) => ({ tag, items: groupItems }));

  if (untagged.length > 0) groups.push({ tag: 'Ohne Tags', items: untagged });

  return groups;
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `node --experimental-strip-types --test tests/tags.test.ts`
Expected: PASS, 5/5 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tags.ts tests/tags.test.ts
git commit -m "feat: tagColor + groupByTags in \$lib/tags.ts extrahieren"
```

---

### Task 4: `Company`-Typ + `mapCompany` um Tags erweitern

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/server/teable-map.ts:14-28` (mapCompany)

**Interfaces:**
- Consumes: `FIRMEN_FIELDS.tags` (aus Task 2).
- Produces: `Company.tags: string[]`, `Seite`, `ViewFilter`, `SavedView` Typen — genutzt von Task 6, 8, 10, 12.

- [ ] **Step 1: `Company`-Typ um `tags` erweitern**

In `src/lib/types.ts`, `Company`-Type:

```ts
export type Company = {
  id: string;
  name: string;
  website: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  land: string | null;
  notizen: string | null;
  tags: string[];
  created_at: string;
  contact_count?: number;
}
```

- [ ] **Step 2: Ansichten-Typen anhängen (Dateiende von `types.ts`)**

```ts
export type Seite = 'kontakte' | 'firmen';

export type ViewFilter = {
  q?: string;
  tags?: string[];
  tagMode?: 'and' | 'or';
  kanal?: string;
  ort?: string;
  sort?: string;
  group?: string;
};

export type SavedView = {
  id: string;
  name: string;
  seite: Seite;
  filter: ViewFilter;
}
```

- [ ] **Step 3: `mapCompany` um `tags` ergänzen**

In `src/lib/server/teable-map.ts`, Zeile 24 (`notizen: ...,`) — direkt danach eine Zeile einfügen:

```ts
export function mapCompany(r: TeableRecord, contactCount = 0) {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id,
    name: f[FIRMEN_FIELDS.name] as string,
    website: (f[FIRMEN_FIELDS.website] as string) ?? null,
    strasse: (f[FIRMEN_FIELDS.strasse] as string) ?? null,
    plz: (f[FIRMEN_FIELDS.plz] as string) ?? null,
    ort: (f[FIRMEN_FIELDS.ort] as string) ?? null,
    land: (f[FIRMEN_FIELDS.land] as string) ?? null,
    notizen: (f[FIRMEN_FIELDS.notizen] as string) ?? null,
    tags: (f[FIRMEN_FIELDS.tags] as string[]) ?? [],
    created_at: r.createdTime ?? null,
    contact_count: contactCount
  };
}
```

- [ ] **Step 4: Build-Check (TypeScript-Fehler durch neuen Pflicht-Feldtyp abfangen)**

Run: `npm run build`
Expected: baut durch. Falls TypeScript an einer Stelle meckert, dass `Company` ohne `tags` konstruiert wird (z.B. spätere Tasks noch nicht fertig) — das ist erwartet und wird in Task 11/12 behoben; an dieser Stelle nur sicherstellen, dass es an `types.ts`/`teable-map.ts` selbst keinen Fehler gibt.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/server/teable-map.ts
git commit -m "feat: Company.tags + Ansichten-Typen (Seite, ViewFilter, SavedView)"
```

---

### Task 5: `TagInput.svelte` extrahieren, `ContactForm.svelte` umstellen

**Files:**
- Create: `src/lib/components/TagInput.svelte`
- Modify: `src/lib/components/ContactForm.svelte:1-70` (Script), `:363-384` (Markup)

**Interfaces:**
- Consumes: `tagColor` aus `$lib/tags` (Task 3).
- Produces: `<TagInput bind:tags placeholder?>` — genutzt von `ContactForm.svelte` (dieser Task) und `companies/+page.svelte` (Task 12).

- [ ] **Step 1: `TagInput.svelte` schreiben**

```svelte
<script lang="ts">
  import { tagColor } from '$lib/tags';

  let {
    tags = $bindable([]),
    placeholder = 'Tag … Enter'
  }: {
    tags: string[];
    placeholder?: string;
  } = $props();

  let tagInput = $state('');

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) tags = [...tags, t];
    tagInput = '';
  }

  function removeTag(t: string) {
    tags = tags.filter((x) => x !== t);
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }
</script>

<input type="hidden" name="tags" value={tags.join(',')} />
<div
  class="flex flex-wrap gap-1.5 px-2 py-1.5 bg-cream border border-line rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-terracotta/30 focus-within:border-terracotta cursor-text"
  onclick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus(); }}
>
  {#each tags as t}
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border {tagColor(t)}">
      {t}
      <button type="button" onclick={() => removeTag(t)} class="hover:opacity-70 transition-opacity leading-none">×</button>
    </span>
  {/each}
  <input
    bind:value={tagInput}
    onkeydown={handleTagKeydown}
    type="text"
    class="flex-1 min-w-[100px] bg-transparent text-base text-ink placeholder-ink/30 focus:outline-none py-0.5"
    placeholder={tags.length === 0 ? placeholder : ''}
  />
</div>
```

- [ ] **Step 2: `ContactForm.svelte` — Script-Block bereinigen**

In `src/lib/components/ContactForm.svelte`, Zeilen 38-69 (`const TAG_COLORS = [...]` bis Ende von `handleTagKeydown`) komplett löschen. Zeile 1 (`import type { Contact, Company } from '$lib/types';`) um den TagInput-Import ergänzen:

```ts
  import type { Contact, Company } from '$lib/types';
  import TagInput from './TagInput.svelte';
```

`let tagInput = $state('');` (Zeile 35) ebenfalls löschen — wird jetzt in `TagInput.svelte` gehalten. `let tags = $state<string[]>(contact?.tags ?? []);` (Zeile 34) bleibt bestehen.

- [ ] **Step 3: `ContactForm.svelte` — Markup ersetzen**

Zeilen 363-384 (der komplette `<!-- Tags (Chip UI) -->`-Block) ersetzen durch:

```svelte
          <!-- Tags -->
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Tags</label>
            <TagInput bind:tags placeholder="privat, schüler … Enter" />
          </div>
```

- [ ] **Step 4: Build-Check**

Run: `npm run build`
Expected: baut durch, keine TypeScript-/Svelte-Fehler zu `TagInput`/`tagColor`.

- [ ] **Step 5: Manuelle Regressions-Prüfung im Dev-Server**

Run: `npm run dev -- --port 5183 &`, im Browser `http://localhost:5183/contacts` öffnen, „Neuer Kontakt" → Tag eintippen + Enter → Chip erscheint in derselben Farbe wie vorher, Backspace bei leerem Feld entfernt letzten Chip.
Expected: Verhalten identisch zum Stand vor dieser Änderung (reine Extraktion, keine Verhaltensänderung).
Dev-Server danach beenden.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/TagInput.svelte src/lib/components/ContactForm.svelte
git commit -m "refactor: Tag-Chip-Input aus ContactForm in \$lib/components/TagInput.svelte extrahieren"
```

---

### Task 6: `$lib/server/views.ts` (CRUD) + `$lib/views.ts` (Filter-Vergleich)

**Files:**
- Create: `src/lib/server/views.ts`
- Create: `src/lib/views.ts`
- Test: `tests/views.integration.test.ts`

**Interfaces:**
- Consumes: `TABLES.ansichten`, `ANSICHTEN_FIELDS` (Task 2), `ViewFilter`/`SavedView`/`Seite` (Task 4), `listRecords`/`createRecord`/`updateRecord`/`deleteRecord` aus `./teable`.
- Produces: `listViews(seite)`, `createView(seite, name, filter)`, `renameView(id, name)`, `deleteView(id)` — genutzt von Task 9, 11, 7. `filtersEqual(a, b)`, `isDefaultFilter(f)` — genutzt von Task 8 (`ViewTabs.svelte`).

- [ ] **Step 1: `src/lib/server/views.ts` schreiben**

```ts
// src/lib/server/views.ts
// CRUD-Wrapper um die Gespeicherte_Ansichten-Tabelle in Teable.
import { listRecords, createRecord, updateRecord, deleteRecord } from './teable';
import { TABLES, ANSICHTEN_FIELDS } from './teable-schema';
import type { Seite, SavedView, ViewFilter } from '../types';

function parseFilter(raw: unknown): ViewFilter {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    return JSON.parse(raw) as ViewFilter;
  } catch {
    return {};
  }
}

export async function listViews(seite: Seite): Promise<SavedView[]> {
  const recs = await listRecords(TABLES.ansichten);
  return recs
    .filter((r) => r.fields[ANSICHTEN_FIELDS.seite] === seite)
    .map((r) => ({
      id: r.id,
      name: r.fields[ANSICHTEN_FIELDS.name] as string,
      seite,
      filter: parseFilter(r.fields[ANSICHTEN_FIELDS.filter])
    }));
}

export async function createView(seite: Seite, name: string, filter: ViewFilter): Promise<SavedView> {
  const rec = await createRecord(TABLES.ansichten, {
    [ANSICHTEN_FIELDS.name]: name,
    [ANSICHTEN_FIELDS.seite]: seite,
    [ANSICHTEN_FIELDS.filter]: JSON.stringify(filter),
    [ANSICHTEN_FIELDS.erstelltAm]: new Date().toISOString()
  });
  return { id: rec.id, name, seite, filter };
}

export async function renameView(id: string, name: string): Promise<void> {
  await updateRecord(TABLES.ansichten, id, { [ANSICHTEN_FIELDS.name]: name });
}

export async function deleteView(id: string): Promise<void> {
  await deleteRecord(TABLES.ansichten, id);
}
```

- [ ] **Step 2: `src/lib/views.ts` schreiben (client-sicher, keine Server-Imports)**

```ts
// src/lib/views.ts
// Client-sicherer Filter-Vergleich für die Tab-Leiste (ViewTabs.svelte).
import type { ViewFilter } from './types';

function norm(f: ViewFilter): string {
  return JSON.stringify({
    q: f.q ?? '',
    tags: [...(f.tags ?? [])].sort(),
    tagMode: f.tagMode ?? 'or',
    kanal: f.kanal ?? '',
    ort: f.ort ?? '',
    sort: f.sort ?? 'name',
    group: f.group ?? ''
  });
}

export function filtersEqual(a: ViewFilter, b: ViewFilter): boolean {
  return norm(a) === norm(b);
}

export function isDefaultFilter(f: ViewFilter): boolean {
  return norm(f) === norm({});
}
```

- [ ] **Step 3: Integrationstest schreiben (läuft gegen echtes Teable, räumt sich selbst auf)**

`tests/views.integration.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listViews, createView, renameView, deleteView } from '../src/lib/server/views.ts';

test('views.ts: create -> list -> rename -> delete Round-Trip gegen echtes Teable', async () => {
  const created = await createView('kontakte', 'TEST_TMP_ansicht', { tags: ['test'], tagMode: 'or' });
  try {
    const afterCreate = await listViews('kontakte');
    assert.ok(afterCreate.some((v) => v.id === created.id && v.name === 'TEST_TMP_ansicht'));

    await renameView(created.id, 'TEST_TMP_ansicht_umbenannt');
    const afterRename = await listViews('kontakte');
    const renamed = afterRename.find((v) => v.id === created.id);
    assert.equal(renamed?.name, 'TEST_TMP_ansicht_umbenannt');
    assert.deepEqual(renamed?.filter, { tags: ['test'], tagMode: 'or' });
  } finally {
    await deleteView(created.id);
  }

  const afterDelete = await listViews('kontakte');
  assert.ok(!afterDelete.some((v) => v.id === created.id));
});
```

- [ ] **Step 4: Test laufen lassen (Env aus `.env` laden)**

Run: `set -a && source .env && set +a && node --experimental-strip-types --test tests/views.integration.test.ts`
Expected: PASS. Falls FAIL mit „TEABLE_API_KEY not set" — `.env` im Repo-Root prüfen. Falls FAIL mit 404/422 gegen `TABLES.ansichten` — Task 2 Step 4 nochmal prüfen (ID falsch übertragen).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/views.ts src/lib/views.ts tests/views.integration.test.ts
git commit -m "feat: CRUD für gespeicherte Ansichten (\$lib/server/views.ts) + Filter-Vergleich (\$lib/views.ts)"
```

---

### Task 7: `/api/views` — Server-Route für Anlegen/Umbenennen/Löschen

**Files:**
- Create: `src/routes/api/views/+server.ts`

**Interfaces:**
- Consumes: `createView`, `renameView`, `deleteView` aus `$lib/server/views` (Task 6).
- Produces: `POST /api/views` `{seite, name, filter}` → `SavedView`; `PATCH /api/views` `{id, name}` → `{success}`; `DELETE /api/views` `{id}` → `{success}` — genutzt von `ViewTabs.svelte` (Task 8).

- [ ] **Step 1: Route schreiben**

```ts
// src/routes/api/views/+server.ts
import { json } from '@sveltejs/kit';
import { createView, renameView, deleteView } from '$lib/server/views';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { seite, name, filter } = await request.json();
  if (!seite || !name) return json({ error: 'seite und name erforderlich' }, { status: 400 });
  const view = await createView(seite, name, filter ?? {});
  return json(view);
};

export const PATCH: RequestHandler = async ({ request }) => {
  const { id, name } = await request.json();
  if (!id || !name) return json({ error: 'id und name erforderlich' }, { status: 400 });
  await renameView(id, name);
  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const { id } = await request.json();
  if (!id) return json({ error: 'id erforderlich' }, { status: 400 });
  await deleteView(id);
  return json({ success: true });
};
```

- [ ] **Step 2: Build-Check**

Run: `npm run build`
Expected: baut durch.

- [ ] **Step 3: Manueller Round-Trip gegen den Dev-Server**

Run: `npm run dev -- --port 5183 &` dann:
```bash
curl -s -X POST http://localhost:5183/api/views -H "Content-Type: application/json" \
  -d '{"seite":"kontakte","name":"TEST_TMP_api","filter":{"tags":["x"]}}'
```
Expected: JSON mit `id`, `name: "TEST_TMP_api"`. Die zurückgegebene `id` merken, dann:
```bash
curl -s -X DELETE http://localhost:5183/api/views -H "Content-Type: application/json" -d '{"id":"<id von oben>"}'
```
Expected: `{"success":true}`. Dev-Server danach beenden.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/views/+server.ts
git commit -m "feat: /api/views — Server-Route für gespeicherte Ansichten (create/rename/delete)"
```

---

### Task 8: `ViewTabs.svelte` — Tab-Leiste für gespeicherte Ansichten

**Files:**
- Create: `src/lib/components/ViewTabs.svelte`

**Interfaces:**
- Consumes: `SavedView`, `ViewFilter`, `Seite` (Task 4), `filtersEqual`/`isDefaultFilter` (Task 6), `POST`/`PATCH`/`DELETE /api/views` (Task 7).
- Produces: `<ViewTabs seite views currentFilter onselect />` — genutzt von `contacts/+page.svelte` (Task 10) und `companies/+page.svelte` (Task 12). `onselect(filter: ViewFilter)` wird mit `{}` aufgerufen für den "Alle"-Tab.

- [ ] **Step 1: Komponente schreiben**

```svelte
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/toast';
  import type { SavedView, ViewFilter, Seite } from '$lib/types';
  import { filtersEqual, isDefaultFilter } from '$lib/views';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import X from '@lucide/svelte/icons/x';

  let {
    seite,
    views,
    currentFilter,
    onselect
  }: {
    seite: Seite;
    views: SavedView[];
    currentFilter: ViewFilter;
    onselect: (filter: ViewFilter) => void;
  } = $props();

  let saving = $state(false);
  let newName = $state('');
  let renaming = $state<string | null>(null);
  let renameValue = $state('');
  let deleteConfirm = $state<string | null>(null);

  async function saveCurrentAsView() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seite, name, filter: currentFilter })
    });
    if (res.ok) {
      toast.success(`Ansicht „${name}" gespeichert`);
      newName = '';
      saving = false;
      await invalidateAll();
    } else {
      toast.error('Ansicht konnte nicht gespeichert werden');
    }
  }

  async function confirmRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    const res = await fetch('/api/views', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name })
    });
    if (res.ok) {
      toast.success('Umbenannt');
      renaming = null;
      await invalidateAll();
    } else {
      toast.error('Umbenennen fehlgeschlagen');
    }
  }

  async function confirmDelete(id: string) {
    const res = await fetch('/api/views', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      toast.success('Ansicht gelöscht');
      deleteConfirm = null;
      await invalidateAll();
    } else {
      toast.error('Löschen fehlgeschlagen');
    }
  }
</script>

<div class="flex flex-wrap items-center gap-1.5 mb-4">
  <button
    type="button"
    onclick={() => onselect({})}
    class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors {isDefaultFilter(currentFilter)
      ? 'bg-terracotta text-white border-terracotta'
      : 'bg-surface text-ink/60 border-line hover:border-ink/30'}"
  >
    Alle
  </button>

  {#each views as view (view.id)}
    {#if renaming === view.id}
      <div class="flex items-center gap-1">
        <input
          bind:value={renameValue}
          onkeydown={(e) => e.key === 'Enter' && confirmRename(view.id)}
          class="px-2 py-1 bg-cream border border-terracotta/40 rounded-full text-xs w-28"
        />
        <button type="button" onclick={() => confirmRename(view.id)} class="text-xs text-terracotta">✓</button>
        <button type="button" onclick={() => (renaming = null)} class="text-xs text-ink/40">✕</button>
      </div>
    {:else if deleteConfirm === view.id}
      <div class="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs">
        <span>„{view.name}" löschen?</span>
        <button type="button" onclick={() => confirmDelete(view.id)} class="text-red-600 font-medium">Ja</button>
        <button type="button" onclick={() => (deleteConfirm = null)} class="text-ink/40">Nein</button>
      </div>
    {:else}
      <div class="group relative flex items-center">
        <button
          type="button"
          onclick={() => onselect(view.filter)}
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors {filtersEqual(currentFilter, view.filter)
            ? 'bg-terracotta text-white border-terracotta'
            : 'bg-surface text-ink/60 border-line hover:border-ink/30'}"
        >
          {view.name}
        </button>
        <span class="hidden group-hover:flex items-center gap-0.5 absolute -right-1 -top-1 bg-surface rounded-full border border-line shadow-sm">
          <button type="button" title="Umbenennen" onclick={() => { renaming = view.id; renameValue = view.name; }} class="p-0.5 text-ink/40 hover:text-terracotta">
            <Pencil class="w-2.5 h-2.5" />
          </button>
          <button type="button" title="Löschen" onclick={() => (deleteConfirm = view.id)} class="p-0.5 text-ink/40 hover:text-red-500">
            <Trash2 class="w-2.5 h-2.5" />
          </button>
        </span>
      </div>
    {/if}
  {/each}

  {#if saving}
    <div class="flex items-center gap-1">
      <input
        bind:value={newName}
        onkeydown={(e) => e.key === 'Enter' && saveCurrentAsView()}
        placeholder="Name der Ansicht"
        class="px-2 py-1 bg-cream border border-terracotta/40 rounded-full text-xs w-32"
      />
      <button type="button" onclick={saveCurrentAsView} class="text-xs text-terracotta">✓</button>
      <button type="button" onclick={() => (saving = false)} class="text-xs text-ink/40"><X class="w-3 h-3" /></button>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => (saving = true)}
      class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-line text-ink/40 hover:border-terracotta hover:text-terracotta transition-colors"
    >
      <Plus class="w-3 h-3" /> Ansicht speichern
    </button>
  {/if}
</div>
```

- [ ] **Step 2: Build-Check**

Run: `npm run build`
Expected: baut durch (die Komponente wird erst in Task 10/12 tatsächlich eingebunden — an dieser Stelle nur auf Syntaxfehler prüfen; `svelte-check`, falls im Projekt vorhanden, sonst reicht `npm run build`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ViewTabs.svelte
git commit -m "feat: ViewTabs.svelte — geteilte Tab-Leiste für gespeicherte Ansichten"
```

---

### Task 9: `contact-filters.ts` (Ort-Filter) + `contacts/+page.server.ts` verdrahten

**Files:**
- Create: `src/lib/server/contact-filters.ts`
- Test: `tests/contact-filters.test.ts`
- Modify: `src/routes/contacts/+page.server.ts` (komplett, siehe Step 4)

**Interfaces:**
- Consumes: `KONTAKTE_FIELDS` (`./teable-schema`), `listViews` (Task 6).
- Produces: `matchesContactFilters(fields, params)`, `sortContacts(contacts, sort)`, `type TagMode`, `type SortKey` — von `+page.server.ts` importiert. `load()` liefert neu zusätzlich `ort: string`, `group: '' | 'tags'`, `allOrte: string[]`, `views: SavedView[]`.

- [ ] **Step 1: Failing Test schreiben**

`tests/contact-filters.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesContactFilters, sortContacts } from '../src/lib/server/contact-filters.ts';
import { KONTAKTE_FIELDS } from '../src/lib/server/teable-schema.ts';

const base = { q: '', tags: [] as string[], tagMode: 'or' as const, kanal: '', ort: '' };

test('matchesContactFilters: ort-Filter schließt andere Städte aus', () => {
  const fields = { [KONTAKTE_FIELDS.ort]: 'Graz' };
  assert.equal(matchesContactFilters(fields, { ...base, ort: 'Wien' }), false);
  assert.equal(matchesContactFilters(fields, { ...base, ort: 'Graz' }), true);
  assert.equal(matchesContactFilters(fields, { ...base, ort: '' }), true);
});

test('matchesContactFilters: Tag-UND-Modus verlangt jeden gewählten Tag', () => {
  const fields = { [KONTAKTE_FIELDS.tags]: ['felix', 'steuerberater'] };
  assert.equal(matchesContactFilters(fields, { ...base, tags: ['felix', 'wp'], tagMode: 'and' }), false);
  assert.equal(matchesContactFilters(fields, { ...base, tags: ['felix', 'steuerberater'], tagMode: 'and' }), true);
});

test('matchesContactFilters: Tag-ODER-Modus verlangt irgendeinen gewählten Tag', () => {
  const fields = { [KONTAKTE_FIELDS.tags]: ['felix'] };
  assert.equal(matchesContactFilters(fields, { ...base, tags: ['felix', 'wp'], tagMode: 'or' }), true);
});

test('sortContacts: Firma-Sortierung fällt bei gleicher Firma auf Name zurück', () => {
  const contacts = [
    { name: 'Zoe', company_name: 'Acme' },
    { name: 'Anna', company_name: 'Acme' },
    { name: 'Bert', company_name: null }
  ];
  const sorted = sortContacts(contacts, 'company');
  assert.deepEqual(sorted.map((c) => c.name), ['Bert', 'Anna', 'Zoe']);
});

test('sortContacts: Tags-Sortierung ordnet nach absteigender Tag-Anzahl', () => {
  const contacts = [
    { name: 'A', company_name: null, tags: ['x'] },
    { name: 'B', company_name: null, tags: ['x', 'y', 'z'] },
    { name: 'C', company_name: null, tags: [] }
  ];
  const sorted = sortContacts(contacts, 'tags');
  assert.deepEqual(sorted.map((c) => c.name), ['B', 'A', 'C']);
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `node --experimental-strip-types --test tests/contact-filters.test.ts`
Expected: FAIL — Modul `../src/lib/server/contact-filters.ts` existiert nicht.

- [ ] **Step 3: `src/lib/server/contact-filters.ts` implementieren**

```ts
// src/lib/server/contact-filters.ts
import { KONTAKTE_FIELDS } from './teable-schema';

export type TagMode = 'and' | 'or';
export type SortKey = 'name' | 'company' | 'tags';

export type ContactFilterParams = {
  q: string;
  tags: string[];
  tagMode: TagMode;
  kanal: string;
  ort: string;
};

export function matchesContactFilters(
  fields: Record<string, unknown>,
  { q, tags, tagMode, kanal, ort }: ContactFilterParams
): boolean {
  if (q) {
    const hay = `${fields[KONTAKTE_FIELDS.name] ?? ''} ${fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  if (tags.length > 0) {
    const recordTags = (fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
    const matches =
      tagMode === 'and'
        ? tags.every((t) => recordTags.includes(t))
        : tags.some((t) => recordTags.includes(t));
    if (!matches) return false;
  }
  if (kanal === 'whatsapp' && !fields[KONTAKTE_FIELDS.whatsapp]) return false;
  if (kanal === 'wechat' && !fields[KONTAKTE_FIELDS.wechatId]) return false;
  if (ort && fields[KONTAKTE_FIELDS.ort] !== ort) return false;
  return true;
}

export function sortContacts<T extends { name: string; company_name: string | null; tags?: string[] }>(
  contacts: T[],
  sort: SortKey
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  if (sort === 'company') {
    return contacts.sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? '') || byName(a, b));
  }
  if (sort === 'tags') {
    return contacts.sort((a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0) || byName(a, b));
  }
  return contacts.sort(byName);
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `node --experimental-strip-types --test tests/contact-filters.test.ts`
Expected: PASS, 5/5 grün.

- [ ] **Step 5: `src/routes/contacts/+page.server.ts` komplett ersetzen**

```ts
import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import { matchesContactFilters, sortContacts } from '$lib/server/contact-filters';
import type { TagMode, SortKey } from '$lib/server/contact-filters';
import { listViews } from '$lib/server/views';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const kanal = url.searchParams.get('kanal') || '';
  const ort = url.searchParams.get('ort') || '';
  const group = url.searchParams.get('group') === 'tags' ? 'tags' : '';
  const sort = ((): SortKey => {
    const s = url.searchParams.get('sort');
    return s === 'company' || s === 'tags' ? s : 'name';
  })();
  const tagMode: TagMode = url.searchParams.get('mode') === 'and' ? 'and' : 'or';

  // 'tags' (Komma-Liste) ist der aktuelle Mehrfach-Filter-Parameter. Das alte
  // einzelne 'tag' bleibt als Fallback gültig, damit bestehende/geteilte
  // Links weiterhin funktionieren.
  const tagsParam = url.searchParams.get('tags');
  const legacyTag = url.searchParams.get('tag');
  const tags = tagsParam
    ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
    : legacyTag
      ? [legacyTag]
      : [];

  const [kontakteRecs, firmenRecs, views] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen),
    listViews('kontakte')
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const contacts = sortContacts(
    kontakteRecs
      .filter((r) => matchesContactFilters(r.fields, { q, tags, tagMode, kanal, ort }))
      .map((r) => mapContact(r, firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null)),
    sort
  );

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();
  const allOrte = [...new Set(
    kontakteRecs.map((r) => r.fields[KONTAKTE_FIELDS.ort] as string | undefined).filter((o): o is string => Boolean(o))
  )].sort();

  return { contacts, companies, q, tags, tagMode, kanal, ort, sort, group, allTags, allOrte, views };
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

- [ ] **Step 6: Build-Check**

Run: `npm run build`
Expected: baut durch.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/contact-filters.ts tests/contact-filters.test.ts src/routes/contacts/+page.server.ts
git commit -m "feat: Ort-Filter + Gruppierungs-Param + gespeicherte Ansichten in contacts/+page.server.ts"
```

---

### Task 10: `contacts/+page.svelte` — Ort, Gruppierung, ViewTabs, Gruppen-Rendering

**Files:**
- Modify: `src/routes/contacts/+page.svelte` (komplett, siehe Step 1)

**Interfaces:**
- Consumes: `groupByTags`, `tagColor` (`$lib/tags`), `ViewTabs` (Task 8), `ViewFilter` (`$lib/types`), `data.ort`/`data.group`/`data.allOrte`/`data.views` (Task 9).

- [ ] **Step 1: Datei komplett ersetzen**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ContactForm from '$lib/components/ContactForm.svelte';
  import ViewTabs from '$lib/components/ViewTabs.svelte';
  import { groupByTags, tagColor } from '$lib/tags';
  import type { Contact, ViewFilter } from '$lib/types';
  import Users from '@lucide/svelte/icons/users';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Filter from '@lucide/svelte/icons/filter';
  import X from '@lucide/svelte/icons/x';

  let { data }: { data: PageData } = $props();

  let showForm = $state(false);
  let editContact = $state<Contact | null>(null);
  let searchValue = $state(data.q ?? '');
  let deleteConfirm = $state<string | null>(null);
  let photoCache = $state<Record<string, string>>({});
  let avatarUploadId = $state<string | null>(null);
  let avatarFileInput: HTMLInputElement;

  let debounceTimer: ReturnType<typeof setTimeout>;

  // --- Filter, Sortierung, Gruppierung ---
  let selectedTags = $state<string[]>(data.tags ?? []);
  let tagMode = $state<'or' | 'and'>(data.tagMode === 'and' ? 'and' : 'or');
  let ort = $state(data.ort ?? '');
  let sortBy = $state<'name' | 'company' | 'tags'>(data.sort ?? 'name');
  let group = $state<'' | 'tags'>(data.group === 'tags' ? 'tags' : '');
  let hasTagFilter = $derived(selectedTags.length > 0 || ort !== '');

  let currentFilter = $derived<ViewFilter>({
    tags: selectedTags,
    tagMode,
    sort: sortBy,
    ort,
    group
  });

  function updateUrl() {
    const url = new URL($page.url);
    if (selectedTags.length > 0) url.searchParams.set('tags', selectedTags.join(','));
    else url.searchParams.delete('tags');
    url.searchParams.delete('tag'); // alter Einzel-Parameter — sobald der Nutzer selbst filtert, auf 'tags' migrieren
    if (tagMode === 'and') url.searchParams.set('mode', 'and');
    else url.searchParams.delete('mode');
    if (sortBy !== 'name') url.searchParams.set('sort', sortBy);
    else url.searchParams.delete('sort');
    if (ort) url.searchParams.set('ort', ort);
    else url.searchParams.delete('ort');
    if (group === 'tags') url.searchParams.set('group', 'tags');
    else url.searchParams.delete('group');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  function toggleTag(tag: string) {
    selectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    updateUrl();
  }

  function setTagMode(mode: 'or' | 'and') {
    tagMode = mode;
    updateUrl();
  }

  function setSort(s: 'name' | 'company' | 'tags') {
    sortBy = s;
    updateUrl();
  }

  function setOrt(o: string) {
    ort = o;
    updateUrl();
  }

  function setGroup(g: '' | 'tags') {
    group = g;
    updateUrl();
  }

  function clearTagFilter() {
    selectedTags = [];
    tagMode = 'or';
    ort = '';
    updateUrl();
  }

  function applyView(filter: ViewFilter) {
    selectedTags = filter.tags ?? [];
    tagMode = filter.tagMode === 'and' ? 'and' : 'or';
    sortBy = filter.sort === 'company' || filter.sort === 'tags' ? filter.sort : 'name';
    ort = filter.ort ?? '';
    group = filter.group === 'tags' ? 'tags' : '';
    updateUrl();
  }

  let contactGroups = $derived(group === 'tags' ? groupByTags(data.contacts, (c) => c.tags ?? []) : null);

  async function handleAvatarChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !avatarUploadId) return;
    const targetId = avatarUploadId;
    avatarUploadId = null;

    const resized = await resizeImage(file, 400);
    const fd = new FormData();
    fd.append('image', resized, 'photo.jpg');
    const res = await fetch(`/api/contacts/${targetId}/photo`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      photoCache[targetId] = d.photo;
      toast.success('Foto gespeichert');
    } else {
      toast.error('Upload fehlgeschlagen');
    }
    (e.target as HTMLInputElement).value = '';
  }

  function resizeImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }

  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) {
        url.searchParams.set('q', searchValue.trim());
      } else {
        url.searchParams.delete('q');
      }
      goto(url.toString(), { replaceState: true });
    }, 300);
  }
</script>

{#snippet contactRow(contact: Contact)}
  <tr class="hover:bg-cream/50 transition-colors">
    <td class="px-4 py-3">
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          title="Foto hinzufügen"
          onclick={() => { avatarUploadId = contact.id; avatarFileInput.click(); }}
          class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-terracotta/40 transition-all"
        >
          {#if contact.photo || photoCache[contact.id]}
            <img src={contact.photo || photoCache[contact.id]} alt="" class="w-full h-full object-cover" />
          {:else}
            <div class="w-full h-full bg-terracotta/10 flex items-center justify-center">
              <span class="text-base font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          {/if}
        </button>
        <a href="/contacts/{contact.id}" class="text-sm font-medium text-ink hover:text-terracotta transition-colors">
          {contact.name}
        </a>
      </div>
    </td>
    <td class="px-4 py-3">
      {#if contact.company_name}
        <span class="flex items-center gap-1 text-sm text-ink/60">
          <Building2 class="w-3 h-3 text-ink/30" />
          {contact.company_name}
        </span>
      {:else}
        <span class="text-sm text-ink/20">—</span>
      {/if}
    </td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span class="text-sm text-ink/60">{contact.rolle ?? '—'}</span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">
      <div class="flex items-center gap-2">
        {#if contact.email}
          <a href="mailto:{contact.email}" class="text-ink/40 hover:text-terracotta transition-colors" title={contact.email}>
            <Mail class="w-3.5 h-3.5" />
          </a>
        {/if}
        {#if contact.telefon}
          <a href="tel:{contact.telefon}" class="text-ink/40 hover:text-terracotta transition-colors" title={contact.telefon}>
            <Phone class="w-3.5 h-3.5" />
          </a>
        {/if}
        {#if contact.linkedin_url}
          <a href={contact.linkedin_url} target="_blank" rel="noopener" class="text-ink/40 hover:text-terracotta transition-colors">
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        {/if}
      </div>
    </td>
    <td class="px-4 py-3">
      <div class="flex items-center justify-end gap-1">
        <button
          onclick={() => { editContact = contact; showForm = true; }}
          class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded"
          title="Bearbeiten"
        >
          <Pencil class="w-3.5 h-3.5" />
        </button>
        {#if deleteConfirm === contact.id}
          <form
            method="POST"
            action="?/delete"
            use:enhance={() => {
              return async ({ result, update }) => {
                if (result.type === 'success') toast.success('Kontakt gelöscht');
                else toast.error('Fehler');
                deleteConfirm = null;
                await update();
              };
            }}
            class="flex items-center gap-1"
          >
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
            <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
          </form>
        {:else}
          <button
            onclick={() => (deleteConfirm = contact.id)}
            class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded"
            title="Löschen"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </td>
  </tr>
{/snippet}

<div class="px-4 py-4 md:px-6 md:py-6 max-w-5xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Kontakte</h1>
      <p class="text-sm text-ink/50 mt-1">{data.contacts.length} Kontakte{data.q ? ` für „${data.q}"` : ''}</p>
    </div>
    <button
      onclick={() => { editContact = null; showForm = true; }}
      class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      <Plus class="w-4 h-4" />
      Neuer Kontakt
    </button>
  </div>

  <!-- Search -->
  <div class="relative mb-4">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
    <input
      type="text"
      bind:value={searchValue}
      oninput={handleSearch}
      placeholder="Kontakte suchen..."
      class="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
    />
  </div>

  <ViewTabs seite="kontakte" views={data.views} currentFilter={currentFilter} onselect={applyView} />

  <!-- Tag-Filter + Sortierung -->
  <div class="bg-surface rounded-xl border border-line p-4 mb-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-display font-semibold text-sm text-ink flex items-center gap-2">
        <Filter class="w-3.5 h-3.5 text-sage" /> Filter &amp; Sortierung
      </h2>
      {#if hasTagFilter}
        <button onclick={clearTagFilter} class="text-xs text-ink/40 hover:text-terracotta transition-colors flex items-center gap-1">
          <X class="w-3 h-3" /> Filter löschen
        </button>
      {/if}
    </div>

    {#if data.allTags.length > 0}
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Tags</p>
          {#if selectedTags.length > 1}
            <div class="flex items-center gap-1 text-xs">
              <button
                type="button"
                onclick={() => setTagMode('or')}
                class="px-2 py-0.5 rounded-full border transition-colors {tagMode === 'or' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}"
              >ODER</button>
              <button
                type="button"
                onclick={() => setTagMode('and')}
                class="px-2 py-0.5 rounded-full border transition-colors {tagMode === 'and' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}"
              >UND</button>
            </div>
          {/if}
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each data.allTags as tag}
            <button
              type="button"
              onclick={() => toggleTag(tag)}
              class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all {selectedTags.includes(tag)
                ? tagColor(tag) + ' ring-2 ring-offset-1 ring-terracotta/40'
                : 'bg-cream text-ink/50 border-line hover:border-ink/30'}"
            >
              {tag}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if data.allOrte.length > 0}
      <div class="mb-3">
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Ort</p>
        <select
          value={ort}
          onchange={(e) => setOrt((e.currentTarget as HTMLSelectElement).value)}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="">Alle Orte</option>
          {#each data.allOrte as o}
            <option value={o}>{o}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="flex flex-wrap gap-4">
      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Sortieren nach</p>
        <select
          value={sortBy}
          onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as 'name' | 'company' | 'tags')}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="name">Name (A-Z)</option>
          <option value="company">Firma (A-Z)</option>
          <option value="tags">Anzahl Tags</option>
        </select>
      </div>
      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Gruppieren</p>
        <select
          value={group}
          onchange={(e) => setGroup((e.currentTarget as HTMLSelectElement).value as '' | 'tags')}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="">Keine</option>
          <option value="tags">Nach Tags</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Table -->
  {#if data.contacts.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <Users class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">
        {data.q ? `Keine Ergebnisse für „${data.q}"` : 'Noch keine Kontakte'}
      </p>
      {#if !data.q}
        <button
          onclick={() => { editContact = null; showForm = true; }}
          class="mt-4 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
        >
          Ersten Kontakt anlegen
        </button>
      {/if}
    </div>
  {:else if contactGroups}
    <div class="space-y-4">
      {#each contactGroups as g (g.tag)}
        <div class="bg-surface rounded-xl border border-line overflow-hidden">
          <div class="px-4 py-2.5 bg-cream/70 border-b border-line flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium border {g.tag === 'Ohne Tags' ? 'bg-cream text-ink/40 border-line' : tagColor(g.tag)}">{g.tag}</span>
            <span class="text-xs text-ink/40">{g.items.length}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <tbody class="divide-y divide-line">
                {#each g.items as contact}
                  {@render contactRow(contact)}
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-line bg-cream/50">
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Name</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Firma</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden md:table-cell">Rolle</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden lg:table-cell">Kontakt</th>
              <th class="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            {#each data.contacts as contact}
              {@render contactRow(contact)}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<input
  bind:this={avatarFileInput}
  type="file"
  accept="image/*"
  capture="environment"
  class="hidden"
  onchange={handleAvatarChange}
/>

{#if showForm}
  <ContactForm
    contact={editContact}
    companies={data.companies}
    action={editContact ? '?/update' : '?/create'}
    onclose={() => (showForm = false)}
    onsuccess={() => { showForm = false; goto($page.url.toString(), { invalidateAll: true }); }}
  />
{/if}
```

- [ ] **Step 2: Build-Check**

Run: `npm run build`
Expected: baut durch.

- [ ] **Step 3: Manuelle Verifikation im Dev-Server**

Run: `npm run dev -- --port 5183 &`, `http://localhost:5183/contacts` öffnen.
Prüfen: Ort-Dropdown erscheint (falls Kontakte mit Ort existieren) und filtert korrekt; „Gruppieren" → „Nach Tags" zeigt Gruppen-Abschnitte mit Kopfzeile+Anzahl, ein Kontakt mit mehreren Tags erscheint in mehreren Gruppen, Kontakte ohne Tags in „Ohne Tags" am Ende; bestehende Tag-Filter/Sortierung funktionieren unverändert.
Dev-Server danach beenden.

- [ ] **Step 4: Commit**

```bash
git add src/routes/contacts/+page.svelte
git commit -m "feat: Ort-Filter, Gruppierung nach Tags, ViewTabs in contacts/+page.svelte"
```

---

### Task 11: `company-filters.ts` + `companies/+page.server.ts` — Tags/Ort/Sortierung/Gruppierung/Ansichten

**Files:**
- Create: `src/lib/server/company-filters.ts`
- Test: `tests/company-filters.test.ts`
- Modify: `src/routes/companies/+page.server.ts` (komplett, siehe Step 4)

**Interfaces:**
- Consumes: `FIRMEN_FIELDS` (Task 2), `listViews` (Task 6).
- Produces: `matchesCompanyFilters(fields, params)`, `sortCompanies(companies, sort)`, `type CompanySortKey` — von `+page.server.ts` importiert. `load()` liefert `companies` jetzt inkl. `tags`, plus `tags`, `tagMode`, `ort`, `sort`, `group`, `allTags`, `allOrte`, `views`.

- [ ] **Step 1: Failing Test schreiben**

`tests/company-filters.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `node --experimental-strip-types --test tests/company-filters.test.ts`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: `src/lib/server/company-filters.ts` implementieren**

```ts
// src/lib/server/company-filters.ts
import { FIRMEN_FIELDS } from './teable-schema';

export type TagMode = 'and' | 'or';
export type CompanySortKey = 'name' | 'contacts' | 'tags';

export type CompanyFilterParams = {
  tags: string[];
  tagMode: TagMode;
  ort: string;
};

export function matchesCompanyFilters(
  fields: Record<string, unknown>,
  { tags, tagMode, ort }: CompanyFilterParams
): boolean {
  if (tags.length > 0) {
    const recordTags = (fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [];
    const matches =
      tagMode === 'and'
        ? tags.every((t) => recordTags.includes(t))
        : tags.some((t) => recordTags.includes(t));
    if (!matches) return false;
  }
  if (ort && fields[FIRMEN_FIELDS.ort] !== ort) return false;
  return true;
}

export function sortCompanies<T extends { name: string; contact_count: number; tags?: string[] }>(
  companies: T[],
  sort: CompanySortKey
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  if (sort === 'contacts') {
    return companies.sort((a, b) => b.contact_count - a.contact_count || byName(a, b));
  }
  if (sort === 'tags') {
    return companies.sort((a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0) || byName(a, b));
  }
  return companies.sort(byName);
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `node --experimental-strip-types --test tests/company-filters.test.ts`
Expected: PASS, 4/4 grün.

- [ ] **Step 5: `src/routes/companies/+page.server.ts` komplett ersetzen**

```ts
import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { matchesCompanyFilters, sortCompanies } from '$lib/server/company-filters';
import type { TagMode, CompanySortKey } from '$lib/server/company-filters';
import { listViews } from '$lib/server/views';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function parseTags(d: FormData): string[] {
  const raw = (d.get('tags') as string) || '';
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export const load: PageServerLoad = async ({ url }) => {
  const tagsParam = url.searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const tagMode: TagMode = url.searchParams.get('mode') === 'and' ? 'and' : 'or';
  const ort = url.searchParams.get('ort') || '';
  const group = url.searchParams.get('group') === 'tags' ? 'tags' : '';
  const sort = ((): CompanySortKey => {
    const s = url.searchParams.get('sort');
    return s === 'contacts' || s === 'tags' ? s : 'name';
  })();

  const [firmenRecs, kontakteRecs, views] = await Promise.all([
    listRecords(TABLES.firmen),
    listRecords(TABLES.kontakteReal),
    listViews('firmen')
  ]);

  // Mirror the original SQL: hide companies whose only linked contacts are
  // prospect-only (not applicable any more — prospects are a separate table
  // now, so every company with >=1 real contact, or 0 contacts, is shown).
  const contactCountByCompany = new Map<string, number>();
  for (const k of kontakteRecs) {
    const companyId = linkId(k.fields[KONTAKTE_FIELDS.firma]);
    if (companyId) contactCountByCompany.set(companyId, (contactCountByCompany.get(companyId) ?? 0) + 1);
  }

  const companies = sortCompanies(
    firmenRecs
      .filter((r) => matchesCompanyFilters(r.fields, { tags, tagMode, ort }))
      .map((r) => ({
        id: r.id,
        name: r.fields[FIRMEN_FIELDS.name] as string,
        website: (r.fields[FIRMEN_FIELDS.website] as string) ?? null,
        strasse: (r.fields[FIRMEN_FIELDS.strasse] as string) ?? null,
        plz: (r.fields[FIRMEN_FIELDS.plz] as string) ?? null,
        ort: (r.fields[FIRMEN_FIELDS.ort] as string) ?? null,
        land: (r.fields[FIRMEN_FIELDS.land] as string) ?? null,
        notizen: (r.fields[FIRMEN_FIELDS.notizen] as string) ?? null,
        tags: (r.fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [],
        created_at: r.createdTime ?? '',
        contact_count: contactCountByCompany.get(r.id) ?? 0
      })),
    sort
  );

  const allTags = [...new Set(firmenRecs.flatMap((r) => (r.fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? []))].sort();
  const allOrte = [...new Set(
    firmenRecs.map((r) => r.fields[FIRMEN_FIELDS.ort] as string | undefined).filter((o): o is string => Boolean(o))
  )].sort();

  return { companies, tags, tagMode, ort, sort, group, allTags, allOrte, views };
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
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null,
      [FIRMEN_FIELDS.tags]: parseTags(d)
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
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null,
      [FIRMEN_FIELDS.tags]: parseTags(d)
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

- [ ] **Step 6: Build-Check**

Run: `npm run build`
Expected: baut durch (companies/+page.svelte ist noch der alte Stand — Task 12 zieht das UI nach; ein TypeScript-Fehler dort, weil `company.tags` noch nicht im Template verwendet wird, ist kein Fehler, nur ein ungenutztes Feld).

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/company-filters.ts tests/company-filters.test.ts src/routes/companies/+page.server.ts
git commit -m "feat: Tags/Ort-Filter, Sortierung, Gruppierung, gespeicherte Ansichten in companies/+page.server.ts"
```

---

### Task 12: `companies/+page.svelte` — Tags in Formularen, Filterblock, ViewTabs, Gruppen-Rendering

**Files:**
- Modify: `src/routes/companies/+page.svelte` (komplett, siehe Step 1)

**Interfaces:**
- Consumes: `TagInput` (Task 5), `ViewTabs` (Task 8), `groupByTags`/`tagColor` (`$lib/tags`), `data.tags`/`data.ort`/`data.sort`/`data.group`/`data.allTags`/`data.allOrte`/`data.views` (Task 11).

- [ ] **Step 1: Datei komplett ersetzen**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from '$lib/toast';
  import type { Company, ViewFilter } from '$lib/types';
  import { groupByTags, tagColor } from '$lib/tags';
  import TagInput from '$lib/components/TagInput.svelte';
  import ViewTabs from '$lib/components/ViewTabs.svelte';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Plus from '@lucide/svelte/icons/plus';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Users from '@lucide/svelte/icons/users';
  import Filter from '@lucide/svelte/icons/filter';

  let { data }: { data: PageData } = $props();

  let showCreateForm = $state(false);
  let editId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  let editName = $state('');
  let editWebsite = $state('');
  let editNotizen = $state('');
  let editTags = $state<string[]>([]);
  let createTags = $state<string[]>([]);

  function startEdit(company: Company) {
    editId = company.id;
    editName = company.name;
    editWebsite = company.website ?? '';
    editNotizen = company.notizen ?? '';
    editTags = company.tags ?? [];
  }

  function cancelEdit() {
    editId = null;
  }

  // --- Filter, Sortierung, Gruppierung ---
  let selectedTags = $state<string[]>(data.tags ?? []);
  let tagMode = $state<'or' | 'and'>(data.tagMode === 'and' ? 'and' : 'or');
  let ort = $state(data.ort ?? '');
  let sortBy = $state<'name' | 'contacts' | 'tags'>(data.sort ?? 'name');
  let group = $state<'' | 'tags'>(data.group === 'tags' ? 'tags' : '');
  let hasFilter = $derived(selectedTags.length > 0 || ort !== '');

  let currentFilter = $derived<ViewFilter>({
    tags: selectedTags,
    tagMode,
    sort: sortBy,
    ort,
    group
  });

  function updateUrl() {
    const url = new URL($page.url);
    if (selectedTags.length > 0) url.searchParams.set('tags', selectedTags.join(','));
    else url.searchParams.delete('tags');
    if (tagMode === 'and') url.searchParams.set('mode', 'and');
    else url.searchParams.delete('mode');
    if (ort) url.searchParams.set('ort', ort);
    else url.searchParams.delete('ort');
    if (sortBy !== 'name') url.searchParams.set('sort', sortBy);
    else url.searchParams.delete('sort');
    if (group === 'tags') url.searchParams.set('group', 'tags');
    else url.searchParams.delete('group');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  function toggleTag(tag: string) {
    selectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    updateUrl();
  }

  function setTagMode(mode: 'or' | 'and') {
    tagMode = mode;
    updateUrl();
  }

  function setOrt(o: string) {
    ort = o;
    updateUrl();
  }

  function setSort(s: 'name' | 'contacts' | 'tags') {
    sortBy = s;
    updateUrl();
  }

  function setGroup(g: '' | 'tags') {
    group = g;
    updateUrl();
  }

  function clearFilter() {
    selectedTags = [];
    tagMode = 'or';
    ort = '';
    updateUrl();
  }

  function applyView(filter: ViewFilter) {
    selectedTags = filter.tags ?? [];
    tagMode = filter.tagMode === 'and' ? 'and' : 'or';
    ort = filter.ort ?? '';
    sortBy = filter.sort === 'contacts' || filter.sort === 'tags' ? filter.sort : 'name';
    group = filter.group === 'tags' ? 'tags' : '';
    updateUrl();
  }

  let companyGroups = $derived(group === 'tags' ? groupByTags(data.companies, (c) => c.tags ?? []) : null);
</script>

{#snippet companyRow(company: Company)}
  <div class="p-4">
    {#if editId === company.id}
      <form
        method="POST"
        action="?/update"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') { toast.success('Gespeichert'); cancelEdit(); }
            else toast.error('Fehler');
            await update();
          };
        }}
      >
        <input type="hidden" name="id" value={company.id} />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <input name="name" bind:value={editName} required placeholder="Name"
            class="px-2 py-1.5 bg-cream border border-terracotta/40 rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
          <input name="website" bind:value={editWebsite} placeholder="Website"
            class="px-2 py-1.5 bg-cream border border-line rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
          <input name="notizen" bind:value={editNotizen} placeholder="Notizen"
            class="px-2 py-1.5 bg-cream border border-line rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
        </div>
        <div class="mb-2">
          <TagInput bind:tags={editTags} placeholder="steuerberater, wien … Enter" />
        </div>
        <div class="flex gap-1.5">
          <button type="submit" class="flex items-center gap-1 px-2.5 py-1 bg-terracotta text-white rounded text-xs font-medium">
            <Check class="w-3 h-3" /> Speichern
          </button>
          <button type="button" onclick={cancelEdit} class="flex items-center gap-1 px-2.5 py-1 border border-line rounded text-xs text-ink/60">
            <X class="w-3 h-3" /> Abbrechen
          </button>
        </div>
      </form>
    {:else}
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
            <Building2 class="w-4 h-4 text-sage" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="/companies/{company.id}" class="text-sm font-medium text-ink hover:text-terracotta transition-colors">{company.name}</a>
              {#if company.contact_count > 0}
                <span class="flex items-center gap-0.5 text-xs text-ink/40">
                  <Users class="w-3 h-3" /> {company.contact_count}
                </span>
              {/if}
              {#each company.tags ?? [] as t}
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium border {tagColor(t)}">{t}</span>
              {/each}
            </div>
            {#if company.website}
              <a href={company.website} target="_blank" rel="noopener"
                class="flex items-center gap-1 text-xs text-terracotta hover:underline mt-0.5">
                <ExternalLink class="w-3 h-3" /> {company.website.replace(/^https?:\/\//, '')}
              </a>
            {/if}
            {#if company.notizen}
              <p class="text-xs text-ink/50 mt-0.5">{company.notizen}</p>
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button onclick={() => startEdit(company)}
            class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded">
            <Pencil class="w-3.5 h-3.5" />
          </button>
          {#if deleteConfirm === company.id}
            <form method="POST" action="?/delete"
              use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Gelöscht'); deleteConfirm = null; await update(); }}
              class="flex items-center gap-1">
              <input type="hidden" name="id" value={company.id} />
              <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
              <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
            </form>
          {:else}
            <button onclick={() => (deleteConfirm = company.id)}
              class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<div class="p-6 max-w-4xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Firmen</h1>
      <p class="text-sm text-ink/50 mt-1">{data.companies.length} Firmen</p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      <Plus class="w-4 h-4" />
      Neue Firma
    </button>
  </div>

  <ViewTabs seite="firmen" views={data.views} currentFilter={currentFilter} onselect={applyView} />

  <!-- Filter + Sortierung -->
  <div class="bg-surface rounded-xl border border-line p-4 mb-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-display font-semibold text-sm text-ink flex items-center gap-2">
        <Filter class="w-3.5 h-3.5 text-sage" /> Filter &amp; Sortierung
      </h2>
      {#if hasFilter}
        <button onclick={clearFilter} class="text-xs text-ink/40 hover:text-terracotta transition-colors flex items-center gap-1">
          <X class="w-3 h-3" /> Filter löschen
        </button>
      {/if}
    </div>

    {#if data.allTags.length > 0}
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Tags</p>
          {#if selectedTags.length > 1}
            <div class="flex items-center gap-1 text-xs">
              <button type="button" onclick={() => setTagMode('or')}
                class="px-2 py-0.5 rounded-full border transition-colors {tagMode === 'or' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}">ODER</button>
              <button type="button" onclick={() => setTagMode('and')}
                class="px-2 py-0.5 rounded-full border transition-colors {tagMode === 'and' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}">UND</button>
            </div>
          {/if}
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each data.allTags as tag}
            <button type="button" onclick={() => toggleTag(tag)}
              class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all {selectedTags.includes(tag)
                ? tagColor(tag) + ' ring-2 ring-offset-1 ring-terracotta/40'
                : 'bg-cream text-ink/50 border-line hover:border-ink/30'}">
              {tag}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if data.allOrte.length > 0}
      <div class="mb-3">
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Ort</p>
        <select
          value={ort}
          onchange={(e) => setOrt((e.currentTarget as HTMLSelectElement).value)}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="">Alle Orte</option>
          {#each data.allOrte as o}
            <option value={o}>{o}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="flex flex-wrap gap-4">
      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Sortieren nach</p>
        <select
          value={sortBy}
          onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as 'name' | 'contacts' | 'tags')}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="name">Name (A-Z)</option>
          <option value="contacts">Anzahl Kontakte</option>
          <option value="tags">Anzahl Tags</option>
        </select>
      </div>
      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Gruppieren</p>
        <select
          value={group}
          onchange={(e) => setGroup((e.currentTarget as HTMLSelectElement).value as '' | 'tags')}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="">Keine</option>
          <option value="tags">Nach Tags</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Create form -->
  {#if showCreateForm}
    <form
      method="POST"
      action="?/create"
      class="bg-surface rounded-xl border border-terracotta/30 p-5 mb-6"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            toast.success('Firma erstellt');
            showCreateForm = false;
            createTags = [];
          } else if (result.type === 'failure') {
            toast.error((result.data as any)?.error ?? 'Fehler');
          }
          await update();
        };
      }}
    >
      <h3 class="font-display font-semibold text-base text-ink mb-4">Neue Firma</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1">Name *</label>
          <input name="name" type="text" required placeholder="Firmenname"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Website</label>
          <input name="website" type="url" placeholder="https://..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
          <input name="notizen" type="text" placeholder="Optional..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1">Tags</label>
          <TagInput bind:tags={createTags} placeholder="steuerberater, wien … Enter" />
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick={() => (showCreateForm = false)}
          class="px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream transition-colors">Abbrechen</button>
        <button type="submit"
          class="px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">Erstellen</button>
      </div>
    </form>
  {/if}

  <!-- List -->
  {#if data.companies.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <Building2 class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">
        {hasFilter ? 'Keine Firmen für diesen Filter' : 'Noch keine Firmen'}
      </p>
      {#if !hasFilter}
        <button
          onclick={() => (showCreateForm = true)}
          class="mt-4 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
        >
          Erste Firma anlegen
        </button>
      {/if}
    </div>
  {:else if companyGroups}
    <div class="space-y-4">
      {#each companyGroups as g (g.tag)}
        <div class="bg-surface rounded-xl border border-line overflow-hidden">
          <div class="px-4 py-2.5 bg-cream/70 border-b border-line flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium border {g.tag === 'Ohne Tags' ? 'bg-cream text-ink/40 border-line' : tagColor(g.tag)}">{g.tag}</span>
            <span class="text-xs text-ink/40">{g.items.length}</span>
          </div>
          <div class="divide-y divide-line">
            {#each g.items as company}
              {@render companyRow(company)}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="divide-y divide-line">
        {#each data.companies as company}
          {@render companyRow(company)}
        {/each}
      </div>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Build-Check**

Run: `npm run build`
Expected: baut durch, keine TypeScript-Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/routes/companies/+page.svelte
git commit -m "feat: Tags in Firmen-Formularen, Filterblock, ViewTabs, Gruppierung in companies/+page.svelte"
```

---

### Task 13: Abschluss-Verifikation gegen echtes Teable + Dokumentation

**Files:** keine Code-Änderungen — nur Verifikation + Doku.
- Modify: `docs/superpowers/plans/2026-07-14-kontakte-firmen-filter-views.md` (Checkboxen abhaken)
- Modify (Henry-Repo): `modules/werkbank/mini-crm/protokoll.md`, `modules/werkbank/mini-crm/stand.md`, `data/work-log.json`

**Interfaces:** keine.

- [ ] **Step 1: Alle Unit-Tests gesammelt laufen lassen**

Run: `node --experimental-strip-types --test tests/tags.test.ts tests/contact-filters.test.ts tests/company-filters.test.ts`
Expected: alle PASS (14 Tests aus Task 3/9/11 zusammen).

- [ ] **Step 2: Integrationstest für Ansichten laufen lassen**

Run: `set -a && source .env && set +a && node --experimental-strip-types --test tests/views.integration.test.ts`
Expected: PASS, Testansicht ist am Ende wieder gelöscht (Task 6 Step 3 prüft das selbst).

- [ ] **Step 3: Produktionsbuild**

Run: `npm run build`
Expected: baut ohne Fehler durch.

- [ ] **Step 4: Manueller Round-Trip im Dev-Server gegen echtes Teable**

Run: `npm run dev -- --port 5183 &`, dann im Browser (Playwright MCP oder manuell):
1. `/contacts` → neuen Testkontakt „TEST_TMP Kontakt" mit Tags `test, stb` und Ort `Wien` anlegen.
2. `/companies` → neue Testfirma „TEST_TMP Firma" mit Tags `test` anlegen.
3. Auf `/contacts`: Tag-Filter „test" (ODER) → Testkontakt erscheint. Ort-Filter „Wien" → Testkontakt erscheint, andere Orte gefiltert raus. Sortierung durchklicken (Name/Firma/Tags). Gruppierung „Nach Tags" → Testkontakt erscheint in Gruppe „test" UND „stb".
4. Auf `/contacts`: aktuellen Filter als Ansicht „TEST_TMP Ansicht" speichern → Tab erscheint, ist aktiv markiert. „Alle" klicken → Filter zurückgesetzt, Tab „TEST_TMP Ansicht" wieder anklicken → Filter kommt zurück. Ansicht umbenennen, dann löschen → Tab verschwindet.
5. Gleiche Prüfung (Tag-Filter, Ort-Filter, Sortierung, Gruppierung, Ansicht speichern/umbenennen/löschen) auf `/companies` wiederholen.
6. Testkontakt und Testfirma über die Löschen-Buttons in der UI wieder entfernen.

Expected: alle Schritte funktionieren wie in der Spec beschrieben, am Ende ist Teable wieder im Originalzustand (kein `TEST_TMP`-Datensatz mehr vorhanden). Dev-Server danach beenden.

- [ ] **Step 5: Alle Checkboxen in diesem Plan abhaken, committen**

```bash
git add docs/superpowers/plans/2026-07-14-kontakte-firmen-filter-views.md
git commit -m "docs: Implementierungsplan abgeschlossen — alle Tasks verifiziert"
```

- [ ] **Step 6: Werkbank + Work-Log (Henry-Repo) aktualisieren**

`modules/werkbank/mini-crm/protokoll.md`: neuen Eintrag anhängen mit Datum, was gebaut wurde (Tags für Firmen, Ort-Filter, Gruppierung, gespeicherte Ansichten als Tabs), Commit-Hashes der wichtigsten Commits.
`modules/werkbank/mini-crm/stand.md`: überschreiben mit aktuellem Stand — Feature fertig und lokal verifiziert, noch nicht deployed, wartet auf Felix' Review.
`data/work-log.json`: Eintrag für den heutigen Tag ergänzen (`zeit`, `was`, `modul: "mini-crm"`).

Kein Deploy — das macht Felix selbst nach Review (`./deploy.sh`, wie in `feedback_crm_deploy.md` festgehalten).

---

### Task 14: Interaktionen_Real — Bidirektionalitäts-Diagnose (read-only, unabhängig)

**Files:** keine Code-Änderungen geplant — reine Diagnose. Falls ein Bug gefunden wird: **nicht fixen**, nur dokumentieren und auf Freigabe warten.
- Modify (Henry-Repo): `modules/werkbank/mini-crm/stalling.md` (Ergebnis eintragen, Status von „offen" auf „diagnostiziert" setzen)

**Interfaces:** keine.

**Hintergrund:** unabhängige Anforderung von Felix (2026-07-14, siehe `modules/werkbank/mini-crm/stalling.md` im Henry-Repo): `Interaktionen_Real` (Teable) und die App-Timeline müssen bidirektional vollständig sein — alles in Teable muss in der App sichtbar sein, alles in der App Angelegte muss in Teable landen.

- [ ] **Step 1: Code-Seite lesen**

`src/routes/contacts/[id]/+page.server.ts` lesen (Actions `add_interaction`, `add_email`, `update_interaction`, `update_email`, `delete_interaction`, `delete_email`, sowie `load()`s Timeline-Aufbau über `mapTimelineEntry`). `src/lib/server/teable-map.ts` → `mapTimelineEntry` lesen. `src/lib/server/teable-schema.ts` → `INTERAKTIONEN_FIELDS` lesen. Notieren: welche Felder werden geschrieben, welche gelesen, gibt es Felder in einem, aber nicht im anderen.

- [ ] **Step 2: Live-Daten aus Teable ziehen**

Run (im mini-crm-Repo, mit geladenem `.env`):
```bash
set -a && source .env && set +a
node --experimental-strip-types -e "
import { listRecords } from './src/lib/server/teable.ts';
import { TABLES } from './src/lib/server/teable-schema.ts';
const recs = await listRecords(TABLES.interaktionenReal);
console.log('Anzahl Interaktionen_Real:', recs.length);
console.log('Beispiel-Record:', JSON.stringify(recs[0], null, 2));
const typValues = [...new Set(recs.map(r => r.fields['Typ']))];
console.log('Vorkommende Typ-Werte:', typValues);
"
```
Notieren: passen die `Typ`-Werte zu dem, was `mapTimelineEntry` unterscheidet (`email_rein`/`email_raus` vs. alles andere)? Gibt es Records mit leeren Pflichtfeldern (`Kontakt`, `Datum`), die beim Rendern in der App Probleme machen würden?

- [ ] **Step 3: Schreibrichtung testen (App → Teable), mit Cleanup**

Über die UI (Dev-Server, `/contacts/<id-eines-echten-testbaren-Kontakts-oder-Testkontakts>`) eine Interaktion anlegen („Notiz", Titel „TEST_TMP Interaktion"). Direkt danach per Skript (wie Step 2) `TABLES.interaktionenReal` erneut abfragen und bestätigen, dass der neue Record mit den erwarteten Feldwerten (`Kontakt`, `Typ`, `Datum`, `Titel`) auftaucht. Danach den Testrecord über den Löschen-Button in der UI wieder entfernen und per Skript bestätigen, dass er weg ist.

- [ ] **Step 4: Leserichtung testen (Teable → App)**

Einen der in Step 2 gefundenen echten (nicht-Test-)Records in der App aufrufen (`/contacts/<zugehörige-kontakt-id>`) und in der Timeline suchen. Bestätigen, dass Titel/Text/Datum korrekt angezeigt werden und nicht z.B. „undefined" oder leer sind.

- [ ] **Step 5: Ergebnis dokumentieren, NICHT fixen**

In `modules/werkbank/mini-crm/stalling.md` (Henry-Repo) den bestehenden Eintrag „Interaktionen_Real: bidirektionale Vollständigkeit prüfen" aktualisieren:
- Status auf „diagnostiziert" setzen.
- Befund eintragen: passt alles zusammen (dann Status stattdessen auf „geprüft, unauffällig" setzen), oder welche konkrete Lücke gefunden wurde (fehlendes Feld, falscher Typ-Wert, Record der nicht rendert o.ä.), mit Beispiel-Record-ID.
- Falls eine Lücke gefunden wurde: explizit vermerken „Fix NICHT angewendet, wartet auf Freigabe von Felix" plus einen konkreten Vorschlag, was zu tun wäre.
- Kein Git-Commit von Code nötig, da keine Code-Änderung — nur der Werkbank-Eintrag wird aktualisiert (Henry committet Werkbank-Dateien nicht separat, das ist Freitext-Doku).

---

## Self-Review (durchgeführt beim Schreiben dieses Plans)

- **Spec-Abdeckung:** Firmen-Tags → Task 2/4/11/12. Ort-Filter beide Seiten → Task 9/10/11/12. Sortierung (inkl. neue Firmen-Optionen) → Task 9/11. Gruppierung nach Tags (Mehrfachzugehörigkeit, „Ohne Tags" am Ende) → Task 3, gerendert in Task 10/12. Gespeicherte Ansichten (geräteübergreifend, getrennt pro Seite, anlegen/umbenennen/löschen, „Alle"-Tab) → Task 2/6/7/8, eingebunden in Task 10/12. dev.sh-Cleanup → Task 1. Kein Deploy → explizit in Global Constraints und Task 13. Interaktionen-Diagnose (nachträglich ergänzt) → Task 14.
- **Platzhalter-Scan:** keine TBD/TODO-Stellen: Teable-IDs, die erst zur Laufzeit entstehen (Task 2 Step 4), sind kein Platzhalter im verbotenen Sinn, sondern ein expliziter, konkret beschriebener Eintrage-Schritt mit Dateiname und Zielstruktur.
- **Typ-Konsistenz geprüft:** `ViewFilter`/`SavedView`/`Seite` (Task 4) werden identisch in `$lib/server/views.ts` (Task 6), `$lib/views.ts` (Task 6), `ViewTabs.svelte` (Task 8), `contacts/+page.svelte` (Task 10) und `companies/+page.svelte` (Task 12) verwendet. `TagGroup<T>`/`groupByTags` (Task 3) identisch in Task 10/12 genutzt. `matchesContactFilters`/`sortContacts`/`SortKey`/`TagMode` (Task 9) und `matchesCompanyFilters`/`sortCompanies`/`CompanySortKey` (Task 11) haben in allen Verwendungsstellen dieselbe Signatur.
