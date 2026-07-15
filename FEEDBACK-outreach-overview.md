# Feedback: /outreach ist unübersichtlich (15.07., nach erstem Live-Test)

**An:** Antigravity/Gemini-Agent (hat `/outreach` in `BRIEF-outreach-overview.md` gebaut,
Commit `ceadad5`)

Felix hat die Seite live angeschaut: Layout ist zu voll, die eigentlich wichtige
Information geht unter. Zwei konkrete Fixes, kein Rebuild nötig — beide Dateien betroffen:
`src/routes/outreach/+page.svelte` + `src/routes/outreach/+page.server.ts`.

## 1. Leere "—"-Zeile unter fast jedem Namen

`+page.server.ts` Zeile 28: `kanzlei: (scraper?.Kanzlei || '—') as string` — viele
Kontakte in `Kontakte_Scraper` haben kein `Kanzlei`-Feld befüllt, also zeigt praktisch
jede zweite Karte nur einen nackten Gedankenstrich unter dem Namen. Sieht kaputt aus,
ist aber nur fehlender Daten-Fallback.

**Fix:** `kanzlei: (scraper?.Kanzlei || '') as string` (leerer String statt `'—'`) im
Server-Loader, und im Template (Zeile 112) die Kanzlei-Zeile nur rendern wenn vorhanden:
```svelte
{#if item.kanzlei}
  <div class="text-xs text-ink/40 mt-0.5 font-medium">{item.kanzlei}</div>
{/if}
```

## 2. Alle 10 Status-Spalten gleich groß und alle voll ausgeklappt

Das ist der Hauptpunkt. Felix' ursprünglicher Wunsch war explizit: *"wer war auf Urlaub,
wann ich wieder anschreiben soll, wen ich kontaktiert habe"* — drei konkrete Fragen,
keine vollständige Datensatz-Ansicht. Aktuell rendert die Seite aber **alle** Karten aus
**allen** Spalten gleichzeitig, inkl. `Gesendet` (207 Karten!) und `Entwurf` (55 Karten) —
das sind reine Massen-Ablagen ohne Handlungsbedarf, aber sie nehmen visuell genauso viel
Platz ein wie die 9 `Auto-Reply`- oder 10 `Geantwortet`-Karten, die eigentlich zählen. Das
erzeugt den "unübersichtlich"-Eindruck: man muss durch hunderte Karten scrollen, um die
paar wichtigen zu finden.

**Vorschlag — Prioritäts-Layout statt gleichwertiger Spalten:**

1. **Oben, immer ausgeklappt (das ist der eigentliche Zweck der Seite):**
   `auto_reply`, `geantwortet`, `gespräch_geführt`, `termin_gebucht` — plus, falls
   umsetzbar: ein eigener Block **"Follow-up überfällig"**, der quer über alle Status
   (nicht nur `gesendet`/`auto_reply`) jeden Datensatz zieht, wo `Follow-up fällig` in der
   Vergangenheit liegt UND `Follow-up gesendet` = false — sortiert nach am längsten
   überfällig zuerst. Das ist die eigentliche "wen muss ich jetzt anschreiben"-Antwort und
   aktuell in der 207er-`Gesendet`-Spalte vergraben.
2. **Unten, standardmäßig eingeklappt** (nur Kopfzeile mit Zähler, Klick zum Aufklappen):
   `entwurf`, `gesendet`, `nicht_gesendet`, `recherche`, `abgelehnt`, `gesperrt` — das
   sind Massen-/Abschluss-Stände, die man selten im Detail braucht, nur die Zahl zählt für
   den groben Überblick.

Svelte-technisch reicht ein simples `let expanded = $state<Record<string,boolean>>({})`
pro Spalten-ID, Default `true` für die Prioritäts-Gruppe und `false` für den Rest — kein
neues Datenmodell, kein Server-Change nötig außer dem Kanzlei-Fallback oben.

## 3. Aussehen "sagt nichts" — von Karten-Raster auf Meldetableau umbauen

Felix' Rückmeldung nach Punkt 1+2: selbst mit besserer Priorisierung bleibt das
Grundproblem, dass 10 gleich aussehende, dünn umrandete Kästchen-Spalten keine Aussage
transportieren — man muss jede Karte einzeln lesen, es gibt keinen Ort, an dem man in
einer Sekunde den Zustand der Kampagne erfasst. Das ist kein Dichte-Problem mehr, sondern
ein Form-Problem: die Seite braucht eine eigene visuelle Idee statt eines generischen
Dashboard-Karten-Rasters.

**Leitidee:** Der eigentliche Inhalt dieser Seite ist *Zeit* — wer ist bis wann weg, wer
ist wie lange überfällig, wann kam die letzte Antwort. Das ist strukturell näher an einer
**Abflugtafel/Meldetableau** als an einem Kanban-Board. Baut die Seite entsprechend um:

```
┌──────────────────────────────────────────────────────────────┐
│ OUTREACH · StB/WP-Kampagne                        [Suche]      │
│                                                                  │
│   3          9          10          3                          │  ← Ampel-Leiste
│ ÜBERFÄLLIG  IM URLAUB  GEANTWORTET  TERMINE                    │    (Signatur-Element)
│  (rot)      (amber)    (sand)       (terracotta)                │
│  Klick springt zur jeweiligen Zeile unten                       │
├──────────────────────────────────────────────────────────────┤
│ JETZT WICHTIG                          sortiert: am längsten    │
│                                          überfällig zuerst       │
│ ┃ Manuela Ermischer      Urlaub bis 14.06.     fällig: heute    │  ← 1 Zeile/Person,
│ ┃ Gabriele Bauer         kein Rückkehrdatum    fällig: 2 Tage   │    farbiger Rand
│ ┃ Karin Fuhrmann         hat geantwortet       28.05.           │    links = Status,
│ ┃ ...                                                            │    kein Kasten-Rand
├──────────────────────────────────────────────────────────────┤
│ ARCHIV                                                           │
│ ▸ Entwurf 55   ▸ Gesendet 207   ▸ Abgelehnt 8   ▸ Gesperrt 7    │  ← ruhig, einzeilig,
│                                                                    │    aufklappbar
└──────────────────────────────────────────────────────────────┘
```

**Token-System (baut auf den bestehenden 4 Themes auf, keine Extra-Palette):**

- Zahlen/Daten immer `font-mono` (`var(--font-mono)` = Roboto Mono, tabular-nums) — das
  ist schon eure eigene Konvention ("Roboto Mono bleibt Zahlen vorbehalten"), aktuell aber
  inkonsequent angewendet. Gerade die großen Ampel-Zahlen und alle Datums-Badges sollten
  konsequent Mono sein — das gibt der Seite den "Instrumenten-Anzeige"-Charakter statt
  generischem Karten-Text.
- Namen/Labels bleiben `font-sans` (Inter, semibold für Namen).
- Farbe: 3 neue **semantische** Tokens statt hartcodierter Hex-Werte, pro Theme in
  `app.css` definiert (gleiches Muster wie `--card-hover`), damit alle 4 Themes
  funktionieren:
  - `--status-critical` → für "Überfällig" — im dark-hirschfeld-Theme bereits vorhandenes
    `--destructive` (`#904446`) wiederverwenden, kein neuer Wert nötig.
  - `--status-away` → für "Im Urlaub"/Auto-Reply — neu, warmes Amber (z. B. `#c98a3e` im
    dark-hirschfeld-Theme), bewusst in der gleichen warmen Familie wie `--primary`
    (`#d9686a`), nicht ein kaltes Signal-Gelb.
  - `--status-positive` → für Geantwortet/Termin — bestehendes `--accent-sand`
    (`#e6c5a8`) wiederverwenden.
  - Jede Zeile in "Jetzt wichtig" bekommt einen 3px farbigen Rand **links** (nicht die
    ganze Karte einfärben) — das reicht als Signal und bleibt ruhig.
- Kein Kasten-Grid mehr für "Jetzt wichtig": einzeilige Liste statt Karten mit Rahmen
  und Schatten (`border shadow-sm` raus) — die Kastigkeit war Teil des "sagt mir nichts"-
  Eindrucks, eine Tabellen-/Zeilen-Optik passt besser zum Meldetableau-Gedanken.
- Archiv-Zeile: einzeilig, `text-ink/40`, keine Rahmen — bewusst der unauffälligste Teil
  der Seite.

**Signatur-Element:** die Ampel-Leiste oben — 4 große Mono-Zahlen mit Farbpunkt, klickbar
(springt zur zugehörigen Zeile). Das ist die eine Stelle, die Felix "in einer Sekunde"
lesen soll — alles andere bleibt bewusst ruhig und zurückhaltend, damit dieses Element
trägt.

**Nicht tun:** keine neue Farbpalette außerhalb der 4 bestehenden Themes, kein Gradient,
kein Glassmorphism/weiche Schatten, keine Flip-Animation auf den Zahlen (Idee ist vom
Meldetableau inspiriert, nicht wörtlich nachgebaut — ein Live-Klapp-Effekt wäre hier zu
viel des Guten).

## Nicht ändern

Read-only, Datenquelle, Suche, Follow-up-Badge-Logik als solche, 4-Theme-Support als
System (nur neue Tokens innerhalb der Themes ergänzen, nicht das Theme-System ersetzen).
