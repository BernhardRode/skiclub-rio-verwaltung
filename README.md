# Skiclub Rio – Ausfahrtsverwaltung Galtür

Webanwendung zur Organisation der jährlichen Skiclub-Rio-Ausfahrt nach Galtür:
Anmeldungen erfassen, Zimmer zuordnen, Skipässe verwalten, Preise für Mitglieder,
Nichtmitglieder und Kinder festlegen und die Ausfahrt auf eine Null-auf-Null-Rechnung
bringen.

**Live:** https://bernhardrode.github.io/skiclub-rio-verwaltung/

## Funktionsumfang

| Bereich | Inhalt |
| --- | --- |
| **Übersicht** | Kennzahlen zu Anmeldungen, Bettenbelegung, Saldo und offenen Beiträgen, Verpflegungswünsche für die Unterkunft und eine Checkliste der nächsten Schritte. |
| **Anmeldungen** | Teilnehmerverwaltung mit Altersgruppe, Mitgliedschaft, Status (angemeldet / bestätigt / Warteliste / storniert), Verpflegungswunsch, kostenloser Teilnahme, Zimmer- und Skipass-Zuordnung, individuellen Zusatzposten, Rabatten und Zahlungseingängen. Suche, Filter, CSV-Export und **CSV-Import bestehender Listen**. |
| **Zimmer** | Der Zimmerplan der Unterkunft ist fest hinterlegt (24 Zimmer, 56 Betten, Haupthaus und Nachbarhaus) und beim ersten Start sofort da. Zimmer lassen sich für eine Saison sperren, statt sie zu löschen. Belegung per Auswahl, Warnung bei Überbelegung, Liste der noch nicht zugeordneten Personen, Zuschlag pro Zimmer, Zimmerplan als CSV. |
| **Skipässe** | Passtypen mit Gültigkeitsdauer, Einkaufs- und Verkaufspreis sowie zulässigen Altersgruppen. Verlinkt die offizielle Preisliste der Bergbahnen, hält fest, wann die Preise zuletzt geprüft wurden, und warnt bei Passtypen ohne Preis. Bedarfsübersicht je Typ inklusive Bestellliste als CSV. |
| **Preise** | Grundpreise je Altersgruppe – getrennt für Mitglieder und Gäste – plus Auswertung, wie sich die Anmeldungen auf die Gruppen verteilen. |
| **Ausgaben** | Kostenposten pauschal, pro Person oder pro Person und Nacht, mit Kategorie, Fälligkeit und Bezahlt-Status. Die Hochrechnung auf die aktuelle Teilnehmerzahl passiert automatisch. |
| **Kalkulation** | Einnahmen gegen Ausgaben, Saldo, Deckungsgrad, Deckungsbeitrag und Break-even-Teilnehmerzahl. Ein Klick gleicht die Grundpreise so aus, dass die Ausfahrt auf Null aufgeht. |
| **Einstellungen** | Eckdaten der Ausfahrt sowie Sicherung, Import und Zurücksetzen der Daten. |

## Preislogik

Der Preis einer Anmeldung setzt sich so zusammen:

```
Grundpreis (Altersgruppe × Mitglied/Gast)
+ Zimmerzuschlag
+ Skipass (Verkaufspreis)
+ individuelle Zusatzposten
− Rabatt
= Gesamtpreis
```

Zwei Sonderfälle sind eingebaut: **stornierte** Anmeldungen zählen weder als Einnahme
noch als Kopf in der Hochrechnung, **beitragsfreie** Teilnehmer (Busfahrer, Helfer)
zahlen nichts, belegen aber ein Bett und verursachen Kosten – sie bleiben deshalb in der
Personenzahl. Personen auf der Warteliste zählen ebenfalls nicht mit.

Auf der Ausgabenseite stehen die erfassten Kostenposten – hochgerechnet auf die Zahl der
zahlenden Personen und die Nächte – sowie optional der automatisch verbuchte
Skipass-Einkauf. 

## Zimmerplan der Unterkunft

Die Unterkunft bleibt von Jahr zu Jahr dieselbe, deshalb steht ihr Zimmerplan fest im
Code (`ZIMMERPLAN` in `src/domain/defaults.ts`): 24 Zimmer mit zusammen 56 Betten.

| Bereich | Zimmer | Betten |
| --- | --- | --- |
| Haupthaus, Erdgeschoss | 01–05 | 9 |
| Haupthaus, 1. Obergeschoss | 101–108 | 23 |
| Haupthaus, 2. Obergeschoss | 201–206 | 14 |
| Drei Länder Hotel (Nachbarhaus) | DL1–DL4 | 9 |
| Mitarbeiterzimmer | MAZ | 1 |

Das **MAZ steht nicht jede Saison zur Verfügung**. Zimmer lassen sich deshalb auf *nicht
verfügbar* stellen, statt sie zu löschen: Sie bleiben im Plan, zählen aber nicht zur
Bettenzahl und werden bei der Belegung nicht mehr angeboten. Liegt trotzdem jemand
darin, meldet die Zimmerseite eine Überbelegung.

Gelöschte Zimmer holt *Fehlende Zimmer ergänzen* auf der Zimmerseite zurück; bestehende
Zimmer bleiben dabei unangetastet. Ein Einzelzimmerzuschlag gehört an das jeweilige
Zimmer (`Zuschlag pro Person`), nicht an die Person.

## Skipasspreise

Die Tarife für den Silvapark Galtür ändern sich jede Saison. Die App hinterlegt deshalb
**keine Preise, sondern die Quelle**: Auf der Skipass-Seite steht ein Link auf die
offizielle Preisliste der Bergbahnen Galtür
(`SKIPASS_QUELLE` in `src/domain/defaults.ts`):

<https://www.galtuer.com/de/winter/betriebszeiten-preise/skipasspreise-silvapark>

Die drei mitgelieferten Passtypen (6 Tage für Erwachsene, Jugendliche und Kinder) starten
bewusst mit **0 €**. Ein geratener Preis wäre schlimmer als gar keiner: Er würde still in
die Null-auf-Null-Rechnung einfließen und sie falsch aussehen lassen. Solange 0 € steht,
weist die Skipass-Seite oben darauf hin, welchen Typen der Preis noch fehlt.

Neben den Preisen lässt sich festhalten, **wann sie zuletzt geprüft wurden**
(`preise.skipassPreisstand`) – hilfreich, wenn die Planung über mehrere Monate läuft und
die Bergbahnen zwischendurch neue Tarife veröffentlichen.

## Import bestehender Listen

Unter *Anmeldungen → Liste importieren* lässt sich eine vorhandene Teilnehmerliste als
CSV übernehmen – etwa die Liste des Vorjahres, aus Excel über *Datei → Speichern unter →
CSV*. Der Import ist auf gewachsene Vereinslisten ausgelegt:

- Eine vorangestellte Titelzeile wird übersprungen; als Kopfzeile gilt die Zeile mit den
  meisten erkannten Spalten.
- Erkannt werden `Name` (oder `Vorname`/`Nachname`), `Tarif`, `Zimmer`, `Essen`,
  `E-Mail`, `Telefon` und `Geburtsdatum` – Groß-/Kleinschreibung und Umlaute egal.
- Namen im Format „Nachname, Vorname“ werden getrennt, Namen ohne Komma bleiben stehen.
- Tarifangaben werden gedeutet: `Mitglied`, `Nicht-Mitglied`, `Mitglied, Jugend`,
  `Kostenlos`. Ein Einzelzimmer-Tarif wird bewusst **nicht** als Tarif geführt – der
  Aufschlag hängt am Zimmer, nicht an der Person.
- Zimmer aus der Liste können auf Wunsch direkt angelegt werden; die Bettenzahl ergibt
  sich aus der Belegung und lässt sich anschließend korrigieren.

Als Trennzeichen werden Semikolon, Tabulator und Komma erkannt, Anführungszeichen
werden beachtet.

## Datenhaltung

Die App läuft vollständig im Browser und kommt ohne Server aus – das ist die
Voraussetzung dafür, dass sie sich auf GitHub Pages ausliefern lässt. Alle Daten liegen
im `localStorage` des jeweiligen Geräts.

Daraus folgen zwei Dinge für die Praxis:

- **Eine Person führt die Liste.** Es gibt keine Synchronisation zwischen Geräten oder
  Browsern.
- **Regelmäßig sichern.** Unter *Einstellungen → Sicherung und Übergabe* lässt sich der
  komplette Stand als JSON exportieren und auf einem anderen Gerät oder bei der Übergabe
  an die nächste Ausfahrtsleitung wieder importieren.

Teilnehmerdaten gehören nicht ins Repository. `.gitignore` schließt deshalb `*.xlsx`,
`*.csv` und die JSON-Sicherungen aus.

Soll später mehrgleisig gearbeitet werden, wäre der nächste Schritt ein Backend
(z. B. Supabase) hinter der bestehenden Store-Schicht in `src/store/useAusfahrt.ts` –
die Kalkulationslogik in `src/domain/` bleibt davon unberührt.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm run lint       # oxlint
npm run typecheck  # tsc
npm test           # Vitest
npm run build      # Produktionsbuild nach dist/
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, React Router (HashRouter,
damit Tiefenlinks auf GitHub Pages ohne Server-Rewrite funktionieren).

```
src/
├── domain/        Datenmodell und Kalkulation (frei von React, per Vitest getestet)
├── store/         Zustand-Store mit localStorage-Persistenz und Import-Prüfung
├── components/    Layout, Dialog, Formularbausteine
├── pages/         Die acht Ansichten der App
└── lib/           Formatierung, CSV-Export, Listenimport, ID-Erzeugung
```

## Deployment

Zwei GitHub-Actions-Workflows:

- **`ci.yml`** – läuft bei Pull Requests und Pushes auf Feature-Branches: Lint,
  Typecheck, Tests, Build.
- **`deploy.yml`** – läuft bei jedem Push auf `main`: dieselben Prüfungen und
  anschließend das Deployment auf GitHub Pages. Der Basispfad wird aus dem Repository-Namen
  gesetzt (`VITE_BASE_PATH`).

Der Workflow aktiviert GitHub Pages beim ersten Lauf selbst
(`configure-pages` mit `enablement: true`), eine Einrichtung von Hand ist nicht nötig.
Sollte das an den Berechtigungen der Organisation scheitern, unter *Settings → Pages*
als Quelle **GitHub Actions** auswählen und den Workflow erneut starten.

Für eine eigene Domain (z. B. `ausfahrt.skiclub-rio.de`) zusätzlich eine Datei `public/CNAME`
mit dem Hostnamen anlegen und einen CNAME-Eintrag im DNS auf `bernhardrode.github.io`
setzen.
