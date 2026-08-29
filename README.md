# Skiclub Rio – Ausfahrtsverwaltung Galtür

Webanwendung zur Organisation der jährlichen Skiclub-Rio-Ausfahrt nach Galtür:
Anmeldungen erfassen, Zimmer zuordnen, Skipässe verwalten, Preise für Mitglieder,
Nichtmitglieder und Kinder festlegen und die Ausfahrt auf eine Null-auf-Null-Rechnung
bringen.

**Live:** https://bernhardrode.github.io/skiclub-rio-verwaltung/

## Funktionsumfang

| Bereich | Inhalt |
| --- | --- |
| **Übersicht** | Kennzahlen zu Anmeldungen, Bettenbelegung, Saldo und offenen Beiträgen, dazu eine Checkliste der nächsten Schritte. |
| **Anmeldungen** | Teilnehmerverwaltung mit Altersgruppe, Mitgliedschaft, Status (angemeldet / bestätigt / Warteliste / storniert), Zimmer- und Skipass-Zuordnung, individuellen Zusatzposten, Rabatten und Zahlungseingängen. Suche, Filter und CSV-Export. |
| **Zimmer** | Zimmer der Unterkunft mit Bettenzahl und Zuschlag pro Person. Belegung per Auswahl, Warnung bei Überbelegung, Liste der noch nicht zugeordneten Personen, Zimmerplan als CSV. |
| **Skipässe** | Passtypen mit Gültigkeitsdauer, Einkaufs- und Verkaufspreis sowie zulässigen Altersgruppen. Bedarfsübersicht je Typ inklusive Bestellliste als CSV. |
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

Auf der Ausgabenseite stehen die erfassten Kostenposten – hochgerechnet auf die Zahl der
zahlenden Personen und die Nächte – sowie optional der automatisch verbuchte
Skipass-Einkauf. Stornierte Anmeldungen zählen weder als Einnahme noch als Kopf in der
Hochrechnung; Personen auf der Warteliste ebenfalls nicht.

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
└── lib/           Formatierung, CSV-Export, ID-Erzeugung
```

## Deployment

Zwei GitHub-Actions-Workflows:

- **`ci.yml`** – läuft bei Pull Requests und Pushes auf Feature-Branches: Lint,
  Typecheck, Tests, Build.
- **`deploy.yml`** – läuft bei jedem Push auf `main`: dieselben Prüfungen und
  anschließend das Deployment auf GitHub Pages. Der Basispfad wird aus dem Repository-Namen
  gesetzt (`VITE_BASE_PATH`).

**Einmalige Einrichtung:** unter *Settings → Pages* als Quelle **GitHub Actions**
auswählen. Danach veröffentlicht jeder Push auf `main` automatisch.

Für eine eigene Domain (z. B. `ausfahrt.skiclub-rio.de`) zusätzlich eine Datei `public/CNAME`
mit dem Hostnamen anlegen und einen CNAME-Eintrag im DNS auf `bernhardrode.github.io`
setzen.
