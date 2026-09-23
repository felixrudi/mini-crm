# CRM-Verbesserung — Übersicht und Reihenfolge

Grundlage: fünf Audits vom 21.09.2026 (UI, UX, Code, Emma-Integration, Produkt). Die Berichte liegen in
`/private/tmp/claude-501/-Users-felix-Documents-Henry/11510477-337c-4510-baf8-1f5d2a76075d/scratchpad/crm-review/1-ui.md` bis `5-produkt.md`
(temporär — bei Bedarf nach `docs/audit-2026-09-21/` kopieren).

Alle Befunde stammen aus dem **Code**. Live getestet wurde nur eines: `/api/search` ohne Login antwortet mit `302` auf `auth.hirschfeld.at`. Vor dem CRM sitzt also ein Login-Türsteher.

## Vier Pläne, vier Runden

Jede Runde liefert für sich lauffähige, getestete Software. Nach jeder Runde kannst du aufhören.

| Runde | Plan-Datei | Inhalt | Aufwand | Status |
|---|---|---|---|---|
| 1 | `2026-09-22-crm-01-reparieren.md` | Scan-Firma, Dach-Experiment verwerfen, Kontraste, Dialoge (Esc/Fokus), Leerzustand | ~1 Tag | **ausgearbeitet** |
| 2 | `2026-09-22-crm-02-absichern.md` | Login im Code, Session, XSS, Secrets, Uploads | 1–2 Tage | **ausgearbeitet** |
| 3 | folgt | Bernstein-Angleichung, weniger Filter, Handy-Ansicht, „Nächster Schritt"-Feld, Löschen → markieren, Telefonnummern-Umbruch auf Handy, Tag-Management | 2–3 Tage | wartet auf Entscheidungen 3a–3c |
| 4 | folgt | Emma Stufe 1: Kontakt-Karte „Wer ist das?" im Absender-Panel | 6–8 h | wartet auf Entscheidungen 4a–4d |
| 5 | folgt | Gesprächsmemos + Anhänge (Scans/Fotos) ins CRM statt Obsidian | offen | Entscheidungen 5a–5b geklärt, Plan noch nicht geschrieben |

Runde 3 und 4 sind bewusst noch keine Pläne: Sie hängen an Entscheidungen, die nur du treffen kannst. Ein Plan mit „TBD" wäre schlechter als kein Plan.

## Reihenfolge und Abhängigkeiten

1. Runde 1 zuerst. Sie enthält den einzigen Fehler, der heute **Daten kostet** (Scan-Firma geht verloren), und sie baut den Test-Runner, den alle folgenden Runden brauchen.
2. Runde 2 danach. Sie ersetzt `+layout.server.ts` durch einen echten Türsteher. Deshalb muss deine uncommittete Änderung dort vorher gesichert sein (Task 0 von Runde 1).
3. Runde 4 hängt von Runde 2 ab: Emma ruft eine CRM-API auf, und die muss vorher sauber abgesichert sein.
4. Runde 3 ist von den anderen unabhängig und kann jederzeit dazwischen.

## Entscheidungen, die nur Felix treffen kann

**Vor Runde 1**
- ~~1a. Deine uncommitteten Änderungen an der Dach-Leiste~~ — **geklärt, 22.09.2026:** Felix hat das Dach-Experiment (CRM, Todoist, Emma Mail in einem Fenster) verworfen, es hat mehr Probleme gemacht als gelöst. Runde 1 Task 0 verwirft die uncommittete Änderung an `+layout.svelte` deshalb ersatzlos, ohne weitere Rückfrage.
- **1b. Scan legt fehlende Firma neu an?** Empfehlung: ja. Ein Treffer bei gleichem Namen (ohne Groß-/Kleinschreibung) wird verknüpft, sonst wird die Firma angelegt. Alternative: nur verknüpfen, sonst leer lassen.

**Vor Runde 2**
- **2a. Vertraut das CRM dem Header `Remote-User`?** Empfehlung: nur mit `TRUST_PROXY_USER=1` und nur, wenn Task 0 zeigt, dass der Container-Port nicht direkt erreichbar ist. Ohne das bekommst du nach dem Türsteher noch einen zweiten Passwort-Login.
- **2b. `SESSION_SECRET` als neue Umgebungsvariable** in Coolify. Das ist eine Live-Änderung am Server und braucht dein Ja.
- **2c. Teable-Schlüssel rotieren**, weil der alte in den Image-Schichten steckt. Das ist eine Handlung von dir, ich schlage dafür einen Todoist-Eintrag vor.

**Vor Runde 3**
- **3a. Löschen → „archiviert" markieren.** Das passt zu deiner Regel „nie löschen". Es braucht ein neues Teable-Feld oder den bestehenden Tag `archiv`. Welcher Weg?
- **3b. Startansicht.** Kontaktliste wie heute, oder eine ruhige Ansicht „zuletzt gesprochen"?
- **3c. Wie viele Filter vor der Liste?** Vorschlag: Suche und ein Aufklapper „Filter".
- **3d. Telefonnummern-Layout auf dem Handy.** Felix, 22.09.2026: verschieben sich hässlich (Umbruch/Overflow). Bug, keine Entscheidung nötig — Fix bei der Handy-Ansicht mit einplanen.
- **3e. Tag-Management fehlt komplett.** Felix, 22.09.2026: es gibt keine Verwaltung für Tags (anlegen/umbenennen/löschen/Farbe). Umfang noch zu klären, wenn Runde 3 geplant wird — welche Tags heute schon in Teable stehen, ob eine eigene Verwaltungsseite nötig ist oder ein Inline-Editor an Kontakt/Firma reicht.

**Vor Runde 4**
- **4a.** Kontakte mit mehreren Mail-Adressen: ein Feld mit Komma-Liste, oder ein zweites Feld?
- **4b.** Bekommt die Firma ein Domain-Feld? („Eine Kanzlei = ein Erstkontakt" wird dann auch im CRM sichtbar.)
- **4c.** Vermerk ins CRM per Knopf (Empfehlung) oder automatisch?
- **4d.** Vor oder nach dem Server-Umzug?

**Runde 5 — geklärt (22.09.2026)**
- **5a. Reichweite: nur echte CRM-Kontakte.** Gesprächsmemos zu Kanzleien, Kunden, Geschäftspartnern, die im CRM stehen (oder es wert sind, dort zu stehen), werden künftig als Interaktion im CRM angelegt, nicht mehr als Obsidian-Notiz. Gespräche ohne CRM-Kontakt (Behörden-Rückrufe wie A1, private/projektbezogene Kontakte wie Bashir) bleiben in Obsidian — die Gesprächsmemo-Regel in `CLAUDE.md` gilt für diese unverändert weiter.
- **5b. Altbestand wird migriert.** Bestehende Obsidian-Memos zu Personen, die im CRM als Kontakt stehen, werden nachträglich als Interaktion angelegt (Text + Anhänge), nicht nur neue.
- **Womit das steht und fällt:** die `Interaktionen`-Tabelle in Teable hat heute **kein Anhänge-Feld** (`teable-schema.ts:65-74`) — Dateien hängen bisher nur am *Kontakt* (`KONTAKTE_FIELDS.dateien`), nicht am einzelnen Gespräch. Ohne ein neues Feld + Upload-Route je Interaktion (Vorbild: der bestehende, in Runde 2 gehärtete Datei-Upload am Kontakt) würde ein Scan/Foto aus einem bestimmten Gespräch im allgemeinen Dateien-Stapel des Kontakts untergehen, ohne Bezug zum Gespräch.
- **`CLAUDE.md`-Regel wird erst geändert, wenn Runde 5 ausgeliefert ist**, nicht vorher — sonst gäbe es eine Übergangszeit, in der neue Memos laut Regel ins CRM sollen, aber Anhänge dort noch nirgends hinkönnen. Bis dahin gilt die bestehende Gesprächsmemo-Regel unverändert für alle Memos.
- **Noch offen, vor dem Plan zu klären:** Wie wird beim Anlegen einer Interaktion erkannt, dass es sich um ein „Gesprächsmemo" (langer, strukturierter Text) statt einer kurzen Notiz handelt — eigener Interaktionstyp, oder reicht `typ: meeting/telefonat/besuch` mit langem `Text`? Und: Wie sieht die Migration konkret aus (Skript liest Obsidian-Frontmatter, matched Person gegen CRM-Kontakt per Name/E-Mail, legt Interaktion + Anhänge an, verschiebt die Obsidian-Datei nach `_archiv` oder löscht sie nicht, nur markiert)?

## Regeln, die für alle Pläne gelten

- **Kein `git push`, kein Deploy** ohne dein ausdrückliches „push das" bzw. „deploy das". Der Plan endet jeweils mit einer lokalen Abnahme.
- Vor jedem Deploy: `./dev.sh` und im Browser auf `localhost` prüfen.
- Jede Änderung an Login, Secrets oder Server-Konfiguration wird vor dem Ausführen von dir bestätigt.
- Nach jeder Runde: Werkbank-Eintrag. Es gibt noch keinen Ordner für das CRM. Nach der dritten Aktion legt Henry einen an, nach Rückfrage.

## Was bewusst NICHT gebaut wird (aus dem Produkt-Audit)

- Pipeline oder Kanban.
- Automatische Follow-ups, Überfällig-Zähler, Streaks.
- Eigene Dokumentenablage, Kalender-Spiegelung, Mail-Sync im CRM.
