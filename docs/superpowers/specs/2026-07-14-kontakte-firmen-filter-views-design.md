# Kontakte/Firmen: Filter, Sortierung, Gruppierung, gespeicherte Ansichten

Status: approved, bereit für Plan
Datum: 2026-07-14

## Kontext

Kontakte hat bereits einen Tag-Filter (UND/ODER) und einfache Sortierung
(Name/Firma/Anzahl Tags). Firmen hat aktuell gar keinen Filter-/Sortierblock.
Felix will auf beiden Seiten ein konsistentes System: mehr Filter-Spalten
(Tags + Ort), Gruppierung nach Tags, und gespeicherte Ansichten als Tabs
oben auf der Seite (z.B. ein Tab "Steuerberater" = vorausgewählte Tags).

## Ziel

- Kontakte UND Firmen: Filter nach Tags (UND/ODER, Mehrfachauswahl) + Filter
  nach Ort (Single-Select-Dropdown).
- Kontakte UND Firmen: Sortierung — Kontakte: Name/Firma/Anzahl Tags
  (unverändert). Firmen (neu): Name/Anzahl Kontakte/Anzahl Tags.
- Kontakte UND Firmen: Gruppierung nach Tags (an/aus). Kein anderes
  Gruppierungskriterium.
- Gespeicherte Ansichten (Name + Filter/Sort/Group-Kombination) als Tabs
  oben auf der jeweiligen Seite, geräteübergreifend über Teable gespeichert.
  Anlegen, Umbenennen, Löschen. Fester "Alle"-Tab, nicht löschbar.

## Nicht-Ziele (explizit ausgeschlossen)

- Keine Sortierung/Gruppierung nach Ort — nur Filter.
- Kein Drag-and-Drop-Reordering der Tabs (Reihenfolge = Anlage-Reihenfolge).
- Keine gemeinsamen Ansichten zwischen Kontakte- und Firmen-Seite — getrennt.
- Keine Suche/Kanal-Filter auf der Firmen-Seite (war nicht gefordert).
- PLZ, Land, Rolle als Filter — nicht gefordert, nicht bauen.
- Kein Deploy als Teil dieser Arbeit — nur lokal bauen und testen.

## Datenmodell-Änderungen (Teable)

Zwei Änderungen, per Python-Script (Muster:
`Henry/scripts/create_crm_teable_schema.py`, dry-run zuerst, dann
`--commit`), IDs danach in `src/lib/server/teable-schema.ts` eintragen:

1. Neues Feld `Tags` (multipleSelect, leere choices — wächst dynamisch wie
   bei Kontakte_Real) auf Tabelle `Firmen`.
2. Neue Tabelle `Gespeicherte_Ansichten` in base `felix_base`:
   - `Name` (singleLineText)
   - `Seite` (singleSelect: `kontakte` | `firmen`)
   - `Filter` (longText — JSON-String: `{q, tags, tagMode, ort, sort, group}`,
     Feld je nach Seite genutzt/leer)
   - `Erstellt am` (date)

`Ort` braucht keine Schema-Änderung — existiert bereits auf `Firmen` und
`Kontakte_Real`.

## Architektur

**URL-Parameter** (wie bisher bei Kontakte, jetzt auch bei Firmen):
`?q=&tags=&mode=&kanal=&ort=&sort=&group=` — `group` ist neu (`''` oder
`tags`), `ort` ist neu. Firmen nutzt keine `q`/`kanal`.

**Aktiver Tab:** kein eigener State — wird abgeleitet, indem die aktuellen
URL-Parameter mit dem geparsten `Filter`-JSON jeder gespeicherten Ansicht
verglichen werden. Exakter Match → Tab aktiv. Kein Match → kein Tab
hervorgehoben (impliziter "eigener Filter"-Zustand). Leere Parameter →
"Alle" aktiv.

**Gruppierung nach Tags** (gilt für Kontakte und Firmen gleich):
- Datensatz erscheint in **jeder** Gruppe, zu der ein Tag passt (Dopplung ok).
- Datensätze ohne Tags landen in einer eigenen Gruppe "Ohne Tags", am Ende.
- Gruppen alphabetisch sortiert (außer "Ohne Tags", immer letzte).
- Innerhalb jeder Gruppe gilt der gewählte Sort-Key.

## Komponenten

- `src/lib/tags.ts` (neu, aus contacts/+page.svelte extrahiert) — Tag-Farb-
  Hash-Funktion (bisher dort lokal definiert) + `groupByTags(items, tagsOf)`
  Hilfsfunktion für die Gruppierungslogik oben. Grund: identische Logik wird
  jetzt auf zwei Seiten gebraucht, keine spekulative Abstraktion.
- `src/lib/server/views.ts` (neu) — dünne CRUD-Wrapper um
  `TABLES.ansichten`: `listViews(seite)`, `createView(seite, name, filter)`,
  `renameView(id, name)`, `deleteView(id)`.
- `src/lib/components/ViewTabs.svelte` (neu) — Tab-Leiste, auf beiden Seiten
  eingebunden: "Alle"-Tab + gespeicherte Ansichten + "+ Ansicht speichern"
  (Inline-Prompt für Namen) + pro Tab Umbenennen/Löschen (Pencil/Trash-Icons,
  gleiches Bestätigungsmuster wie bestehende Lösch-Buttons in der Codebase).
- `src/routes/contacts/+page.server.ts` — `matchesFilters` um `ort` erweitert,
  neue `group`-Param-Auswertung, `views` per `listViews('kontakte')` laden,
  neue Actions `saveView`/`renameView`/`deleteView`.
- `src/routes/contacts/+page.svelte` — Filterblock um Ort-Dropdown +
  Gruppierung-Toggle erweitert, `ViewTabs` eingebunden, Tabellen-Rendering
  auf Gruppen-Modus umgestellt (Gruppen als Abschnitte mit Überschrift,
  bestehende `<tr>`-Struktur bleibt pro Zeile gleich).
- `src/routes/companies/+page.server.ts` — komplett neuer Filter-/Sort-/
  Gruppierungs-Block analog zu contacts (eigene, nicht geteilte Funktionen —
  Firmen und Kontakte haben unterschiedliche Basisfelder).
- `src/routes/companies/+page.svelte` — neuer Filterblock (Tags, Ort, Sort,
  Gruppierung) im gleichen visuellen Stil wie contacts, `ViewTabs`
  eingebunden, Listen-Rendering auf Gruppen-Modus umgestellt.

Kontakte- und Firmen-Filterblock bleiben bewusst getrennte Markups (wie der
Rest der Codebase pro Route eigenständig ist) — nur Logik/Komponenten oben
werden geteilt.

## Vorbereitung

`dev.sh` baut aktuell einen SSH-Tunnel zur alten Postgres-DB auf (Altlast
aus der Teable-Migration, wird nicht mehr gebraucht) und lädt `.env` nicht
explizit — das blockiert sauberes lokales Testen. Wird vor der eigentlichen
Feature-Arbeit bereinigt: Tunnel-Logik raus, `dev.sh` startet nur noch
`npm run dev` (Vite lädt `.env` automatisch im Dev-Modus).

## Testing

- Lokal via `npm run dev`, Produktionsbuild (`npm run build`) muss sauber
  durchlaufen.
- Round-Trip gegen echtes Teable: Testkontakt/-firma mit Tags/Ort anlegen,
  alle Filter-/Sort-/Gruppier-/Ansichten-Kombinationen durchklicken, Testdaten
  danach wieder löschen (Teable im Originalzustand belassen — wie in der
  letzten Session).
- Kein Deploy — Ergebnis wird dokumentiert (Werkbank `modules/werkbank/
  mini-crm/`), Felix testet/deployt morgen selbst nach Review.

## Offene Punkte

Keine — alle Gray-Areas wurden im Gespräch geklärt (siehe Nicht-Ziele oben
für explizit ausgeschlossenen Scope).
