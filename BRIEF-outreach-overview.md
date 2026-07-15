# Brief: Outreach-Überblick in mini-crm

**Für:** Antigravity/Gemini-Agent (baut in diesem Repo weiter)
**Kontext:** Felix (Product Owner) will einen rein visuellen, lesenden Überblick über den
Stand seiner Kaltakquise-Kampagne (StB/WP-Outreach) — konkret: *wer ist gerade auf Urlaub
(Auto-Reply), wann muss ich wieder anschreiben (Follow-up fällig), wen habe ich wann
kontaktiert.* Kein Kanban-Board zum Ziehen, kein neues Datenmodell, kein Worker/Webhook —
nur eine schnelle, gruppierte Ansicht der Wahrheit, die schon in Teable liegt.

**Aufwand-Leitplanke:** Klein halten. Felix hat in dieser Session bewusst ein
Aufgaben-Feature aus mini-crm entfernt, weil es zu viel wurde — dieses Feature soll das
Gegenteil sein: eine reine, lesende Übersichtsseite, kein neues Subsystem.

## Was zu bauen ist

Eine neue Route in der bestehenden SvelteKit-5-App (`mini-crm`, TailwindCSS 4), z. B.
`/outreach` oder `/uebersicht`:

- **Nach `Status` gruppierte Ansicht** (Spalten oder Abschnitte, kein Drag&Drop nötig):
  `entwurf`, `gesendet`, `auto_reply`, `geantwortet`, `gespräch_geführt`, `termin_gebucht`,
  `abgelehnt`, `gesperrt`, `recherche`, `nicht_gesendet` (siehe exakte Werte unten).
- **Jede Karte zeigt:** Name + Kanzlei (aus verlinktem Kontakt), `Versandt am`,
  `Gesendet über` (welche Absender-Domain), und je nach Status zusätzlich:
  - `auto_reply` → den Text aus `Notiz`/`Verlauf` anzeigen (Rückkehrdatum steht **nicht**
    strukturiert in einem eigenen Feld, sondern nur als Freitext dort — z. B. "Urlaub bis
    24.07." — also einfach den Text rendern, nicht parsen).
  - `gesendet`/`auto_reply` → `Follow-up fällig` als Badge, **rot/hervorgehoben wenn das
    Datum in der Vergangenheit liegt und `Follow-up gesendet` = false** (das ist die
    eigentliche "wen muss ich anschreiben"-Information).
  - `geantwortet`/`termin_gebucht` → `Antwort (Kurzfassung)` anzeigen falls vorhanden.
- **Read-only.** Kein Schreiben, kein Status-Wechsel per Klick in diesem Feature — nur
  Anzeige. (Status ändert weiterhin Henry über die bestehende Outreach-Pipeline.)
- Einfache Filter/Suche nach Name reicht; keine gespeicherten Ansichten o. Ä. nötig (das
  gibt es für Kontakte/Firmen schon, hier nicht nötig).

## Datenquelle — WICHTIG: andere Teable-Base als mini-crm sonst nutzt

mini-crm liest normalerweise aus der Base `felix_base` (Firmen/Kontakte_Real/Prospects).
**Dieses Feature braucht eine andere Base**, in der Henry die Outreach-Kampagne führt:

- Teable-Host: `https://teable.hirschfeld.at` (gleicher Host, `TEABLE_API_KEY` aus `.env`
  ist derselbe Key, Tabellen sind nicht base-scoped in der URL — `GET /api/table/{tableId}/record`
  funktioniert unabhängig davon, welche Base mini-crm sonst anspricht).
- Base **Marketing-Outreach** (`bseBbF5Z2XiTD0v03Rn`):
  - **Outreach** (Junction-Tabelle) — `tblLHWeNN9dq1ObUE0D` — die Haupttabelle für diese Seite.
  - **Kontakte_Scraper** — `tbltBCdkAvxz1R95ErY` — verlinkter Kontakt (Name, Kanzlei, Email, Ort).
  - (Kampagnen `tblcm7YOkfjYSu0xJgT` und Interaktionen_Scraper `tbl9pjmqLwqdQgWfswg` nur
    falls du sie für Detail-Anzeige brauchst, für den reinen Überblick nicht nötig.)

### Feld-Schema `Outreach` (`tblLHWeNN9dq1ObUE0D`)

| Feld | Typ | Hinweis |
|---|---|---|
| Name | singleLineText | |
| Nr | number | |
| Kontakt | link → Kontakte_Scraper | für Name/Kanzlei/Email |
| Kampagne | link → Kampagnen | |
| Welle | number | |
| **Status** | singleSelect | Werte: `recherche`, `entwurf`, `gesendet`, `geantwortet`, `auto_reply`, `gespräch_geführt`, `termin_gebucht`, `abgelehnt`, `nicht_gesendet`, `gesperrt` |
| Grund | singleSelect | nur bei `gesperrt`: `kanzlei_dublette`, `big4`, `besonderheit`, `sonstige` |
| Versandt am | date | |
| **Gesendet über** | singleSelect | `felix@hirschfeld-ki.at`, `felix@hirschfeld-ai.at`, `felix@hirschfeld.at` |
| Draft-UID | singleLineText | |
| Anrede | singleLineText | |
| Betreff | singleLineText | |
| Kontakt am | date | |
| Termin | date | bei `termin_gebucht` |
| Kanal | singleSelect | `E-Mail`, `LinkedIn`, `Telefon`, `Vor-Ort` |
| **Follow-up fällig** | date | Kernfeld für "wann wieder anschreiben" |
| Antwort (Kurzfassung) | longText | |
| **Notiz** | longText | enthält bei `auto_reply` den Rückkehr-Hinweis als Freitext |
| Verlauf | longText | Alt-Feld, Archiv (neue Touchpoints laufen über Interaktionen_Scraper) |
| **Follow-up gesendet** | checkbox | true = Nachfass schon raus, dann nicht mehr als "fällig" markieren |
| Interaktionen_Scraper | link | optional für Detail-Ansicht |

### Feld-Schema `Kontakte_Scraper` (`tbltBCdkAvxz1R95ErY`, für Namen/Kanzlei)

`Vorname`, `Nachname`, `Titel`, `Berufsstatus` (StB/WP/StB+WP), `Kanzlei`, `Email`, `Ort`,
`PLZ`, `Website`, `Telefon`, `Global gesperrt` (checkbox).

## API-Zugriff

Gleiches Muster wie der bestehende `src/lib/server/teable.ts`-Client in diesem Repo
(Bearer-Token aus `TEABLE_API_KEY`, Header `User-Agent: curl/8` ist **Pflicht** — die
Teable-WAF blockt Default-User-Agents mit 403, unabhängig vom Token). Am einfachsten:
bestehenden `listRecords<F>(tableId)`-Helper aus `src/lib/server/teable.ts` wiederverwenden
und einfach mit den Outreach-Table-IDs oben aufrufen — der Client ist nicht an eine Base
gebunden, nur an Tabellen-IDs.

## Design

Bestehendes mini-crm-Theme-System nutzen (4 Themes: `dark-hirschfeld`, `light-hybrid`,
`light-neumorphic`, `light-flat`, Umschalter schon in der Sidebar vorhanden) — keine neue
Design-Sprache einführen, nur eine neue Route/Page im bestehenden Look.

## Was NICHT gebaut werden soll (bewusst außerhalb des Scopes)

- Kein Drag&Drop-Kanban, kein Status-Editieren von dieser Seite aus.
- Kein Mail-Ingestion-Worker, kein automatisches Auto-Reply-Parsing.
- Keine neue Teable-Tabelle, kein Schema-Change.
- Kein ClickUp-Sync.

## Akzeptanzkriterium

Felix öffnet die Seite und sieht auf einen Blick: (1) wer gerade auf Urlaub/Auto-Reply ist
inkl. Notiz-Text, (2) wen er laut `Follow-up fällig` (überfällig, `Follow-up gesendet` ≠
true) jetzt anschreiben sollte, (3) grobe Verteilung nach Status. Kein Schreibzugriff nötig.
