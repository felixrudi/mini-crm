# Spec: Mockup-Redesign 1:1 übernehmen (Kontakte, Firmen, Design)

**Kontext:** Felix hat mit einer anderen KI (Antigravity/Gemini) einen visuellen Prototyp gebaut
(`~/.gemini/antigravity-cli/brain/.../dashboard_visual_preview.html` + `dashboard_spec.md`).
Dashboard und Scan & Import sind bereits umgesetzt (mit echten Teable-Daten statt Mock-Werten).
Dieses Dokument fixiert die verbleibenden Entscheidungen für Kontakte-Liste, Firmen-Liste und
das globale Design, damit ohne weitere Rückfragen durchimplementiert werden kann.

## Locked Decisions

### 1. Design — exakte Mockup-Farben, nicht nur "ähnlich"
Die vier bestehenden Themes (`dark-hirschfeld`, `light-hybrid`, `light-neumorphic`, `light-flat`)
bleiben im Theme-Switcher erhalten (nichts Funktionierendes wird gelöscht) — aber `light-hybrid`
wird durch die **exakten** Hex-Werte aus dem Mockup ersetzt (`--bg-main:#f9f6f2`,
`--brand-red:#904446`, `--border:#e6c5a8`, `--text-main:#2b221d`, `--text-dim:#70625a`,
Font-Stack Inter/Roboto Mono) und wird der **Default-Theme** beim ersten Start.

### 2. Sidebar — 5 Items, nicht 4
Der Mockup-Spec wollte 4 Items (Dashboard, Kontakte, Firmen, Scan & Import) und Outreach in
Kontakte/Firmen-Tabs auflösen. Abweichung mit Begründung:
- **`/prospects` ("Outreach")** wird aus der Sidebar entfernt und als Tab
  "Outreach-Marketing (DB)" in die Kontakte-Seite integriert (Route bleibt technisch bestehen,
  nur kein Sidebar-Link mehr).
- **`/outreach` ("Outreach-Überblick") bleibt eigenständig in der Sidebar.** Das ist keine
  "alte Ansicht" — laut `BRIEF-outreach-overview.md` bewusst am 2026-07-15 als schlanke,
  **read-only** Übersicht über die StB/WP-Kaltakquise-Kampagne gebaut (separate Teable-Base
  "Marketing-Outreach", eigene Datenquelle `Kontakte_Scraper`, explizit kein Status-Editieren
  von der Seite aus). Das ins generische Mockup-Tabellenlayout mit Mail/+WV/Edit-Aktionen zu
  pressen würde dieses bewusst minimal gehaltene Feature wieder aufblähen — genau das, was
  laut Brief vermieden werden sollte. Bleibt unverändert bestehen.

Sidebar final: Dashboard, Kontakte, Firmen, Outreach-Überblick, Scan & Import.

### 3. Kontakte-Seite (`/contacts`) — Datenquellen pro Tab
- **"Mein Netzwerk (CRM)"** = bestehende `Kontakte (Real)`-Tabelle (unverändert).
- **"Outreach-Marketing (DB)"** = `Prospects`-Tabelle (`tbl6LjxihnKhe0I5A1L`, bisher `/prospects`).
  Status-Badge-Mapping (echte Enum-Werte, nicht die Mockup-Fantasie-Werte):
  `gesendet` (blau), `geantwortet` (gelb/amber), `termin` (grün), `kein_interesse` (grau),
  `bounce` (rot), `abgesagt` (grau).
- Tag-Pills im Filter gelten nur für "Mein Netzwerk" (Prospects haben kein Tags-Feld in Teable).
- Neue, sichere Server-Action `set_followup` in `prospects/+page.server.ts` für den "📅 +WV"-Button
  (patcht nur `Follow-up am`, nicht den ganzen Datensatz — die bestehende `update`-Action verlangt
  alle Felder und würde bei Teil-Daten andere Felder überschreiben).
- "✉ Mail" = `mailto:`-Link (kein neues E-Mail-Subsystem).
- "🖊 Edit" öffnet das bestehende `ContactForm` (CRM) bzw. das bestehende Prospect-Edit-Formular
  (Outreach) — nicht das Mockup-Fake-Modal.

### 4. Firmen-Seite (`/companies`) — Datenquellen pro Tab
- **"Mein Netzwerk (CRM)"** = bestehende `Firmen`-Tabelle (unverändert).
- **"Outreach-Firmen (DB)"** = aus `Prospects` abgeleitet: eine Zeile pro eindeutiger Firma
  (verlinkt oder `Firma-Text`), Kontakt-Spalte = Anzahl+Namen der Prospects dieser Firma,
  Outreach-Status = Status des zuletzt versandten Prospects dieser Firma. Reine Ableitung,
  kein eigener Teable-Datensatz — daher kein "Löschen"-Button in diesem Tab.

### 5. Bestehende Filter/Sortier/Gruppier/Ansichten-Funktionalität wird NICHT gelöscht
`ViewTabs` (Gespeicherte Ansichten, erst kürzlich gebaut), OR/UND-Tag-Filter, Ort-Filter,
Sortierung, Gruppierung bleiben nutzbar — aber wandern aus der bisherigen eigenen Karte in einen
eingeklappten "⚙ Mehr Filter"-Bereich unterhalb der neuen schlanken Mockup-Filterleiste
(Suche + Tag-Pills + Status/Phase-Dropdown), damit der Kopfbereich optisch 1:1 dem Mockup
entspricht, ohne die Funktion zu verlieren.

### 6. Alte Kartenlisten-Layouts werden ersetzt, nicht daneben gepflegt
Die bisherige Card/Row-Darstellung in `contacts/+page.svelte` und `companies/+page.svelte`
wird vollständig durch die Mockup-Tabelle ersetzt (Avatar+Name+Rolle, Tags, Status-Spalte,
Aktions-Buttons rechtsbündig) — kein Parallelbetrieb zweier Layouts.

### 7. Dashboard-Links anpassen
Quick Action "Outreach starten" zeigt neu auf `/contacts?db=outreach` (statt `/prospects`,
da dort jetzt die UI lebt). "Antwort-Wiedervorlagen" verlinkt weiterhin auf `/outreach`
(unverändert, siehe Punkt 2).

## Umsetzungsreihenfolge
1. Theme-Farben exakt auf Mockup ziehen, Default setzen.
2. Sidebar: `/prospects`-Eintrag raus, Rest bleibt.
3. `prospects/+page.server.ts`: `set_followup`-Action ergänzen.
4. `/contacts` komplett neu (Tabs, Tabelle, Mehr-Filter-Bereich).
5. `/companies` komplett neu (Tabs, Tabelle, Mehr-Filter-Bereich).
6. Dashboard-Links auf `/contacts?db=outreach` umstellen.
7. Browser-Check aller Seiten (Dashboard, Kontakte beide Tabs, Firmen beide Tabs, Scan & Import).
