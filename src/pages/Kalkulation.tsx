import { Karte, Kennzahl, Knopf, Seitenkopf } from '../components/ui'
import { berechneKalkulation } from '../domain/kalkulation'
import {
  ALTERSGRUPPEN,
  AUSGABEN_KATEGORIE_LABEL,
  type AusgabenKategorie,
} from '../domain/types'
import { euro, plural, zahl } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'

export function Kalkulation() {
  const daten = useDaten()
  const { setzePreise } = useAusfahrt()
  const k = berechneKalkulation(daten)

  const ausgeglichen = Math.abs(k.saldo) < 1
  const saldoTon = ausgeglichen ? 'gut' : k.saldo < 0 ? 'schlecht' : 'warnung'

  // Deckungsbeitragsrechnung: Fixkosten gegen den Beitrag je Person.
  const fixkosten = k.ausgabenPosten
    .filter((p) => p.ausgabe.art === 'fix')
    .reduce((summe, p) => summe + p.summe, 0)
  const variableKosten = k.ausgaben - fixkosten
  const einnahmeProPerson = k.personen > 0 ? k.einnahmen / k.personen : 0
  const variabelProPerson = k.personen > 0 ? variableKosten / k.personen : 0
  const deckungsbeitrag = einnahmeProPerson - variabelProPerson
  const breakEvenPersonen =
    deckungsbeitrag > 0 ? Math.ceil(fixkosten / deckungsbeitrag) : null

  const proKategorie = k.ausgabenPosten.reduce(
    (akku, posten) => {
      akku[posten.ausgabe.kategorie] =
        (akku[posten.ausgabe.kategorie] ?? 0) + posten.summe
      return akku
    },
    {} as Partial<Record<AusgabenKategorie, number>>,
  )
  if (k.skipassEinkauf > 0) {
    proKategorie.skipass = (proKategorie.skipass ?? 0) + k.skipassEinkauf
  }
  const kategorien = Object.entries(proKategorie)
    .map(([schluessel, betrag]) => ({
      kategorie: schluessel as AusgabenKategorie,
      betrag: betrag ?? 0,
    }))
    .sort((a, b) => b.betrag - a.betrag)

  const anpassung = -Math.round(k.saldoProPerson)

  /** Verschiebt alle Grundpreise so, dass die Ausfahrt auf Null aufgeht. */
  const preiseAusgleichen = () => {
    const neu = { ...daten.preise.grundpreise }
    for (const gruppe of ALTERSGRUPPEN) {
      const alt = neu[gruppe]
      // Kostenfreie Gruppen (z. B. Kleinkinder) bleiben kostenfrei.
      if (alt.mitglied === 0 && alt.gast === 0) continue
      neu[gruppe] = {
        mitglied: Math.max(0, alt.mitglied + anpassung),
        gast: Math.max(0, alt.gast + anpassung),
      }
    }
    setzePreise({ grundpreise: neu })
  }

  const maximum = Math.max(k.einnahmen, k.ausgaben, 1)

  return (
    <>
      <Seitenkopf
        titel="Kalkulation"
        beschreibung="Ziel der Ausfahrt ist eine Null-auf-Null-Rechnung: Einnahmen decken die Ausgaben, ohne Gewinn und ohne Zuschuss aus der Vereinskasse."
        aktion={
          <Knopf onClick={() => window.print()}>Drucken / als PDF sichern</Knopf>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl
          label="Einnahmen"
          wert={euro(k.einnahmen)}
          zusatz={`${plural(k.personen, 'zahlende Person', 'zahlende Personen')}`}
        />
        <Kennzahl
          label="Ausgaben"
          wert={euro(k.ausgaben)}
          zusatz={`${plural(k.naechte, 'Nacht', 'Nächte')}`}
        />
        <Kennzahl
          label="Saldo"
          wert={euro(k.saldo)}
          ton={saldoTon}
          zusatz={
            ausgeglichen
              ? 'Punktlandung'
              : k.saldo < 0
                ? 'Unterdeckung – es fehlt Geld'
                : 'Überschuss – Preise könnten sinken'
          }
        />
        <Kennzahl
          label="Deckungsgrad"
          wert={`${zahl(k.deckungsgrad)} %`}
          ton={ausgeglichen ? 'gut' : k.deckungsgrad < 100 ? 'schlecht' : 'warnung'}
          zusatz={`${euro(k.saldoProPerson)} pro Person`}
        />
      </div>

      <Karte titel="Einnahmen gegen Ausgaben">
        <div className="space-y-3">
          <Balken
            label="Einnahmen"
            betrag={k.einnahmen}
            anteil={k.einnahmen / maximum}
            farbe="bg-emerald-500"
          />
          <Balken
            label="Ausgaben"
            betrag={k.ausgaben}
            anteil={k.ausgaben / maximum}
            farbe="bg-alpen-500"
          />
        </div>

        {k.personen === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Sobald die ersten Anmeldungen erfasst sind, erscheint hier der Vorschlag zur
            Preisanpassung.
          </p>
        ) : ausgeglichen ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Die Ausfahrt geht mit dem aktuellen Stand auf Null auf. Beim nächsten
            Anmeldestand hier erneut prüfen.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>
              {k.saldo < 0 ? (
                <>
                  Es fehlen <strong>{euro(-k.saldo)}</strong>. Der Grundpreis müsste um{' '}
                  <strong>{euro(anpassung)}</strong> pro Person steigen.
                </>
              ) : (
                <>
                  Es bleiben <strong>{euro(k.saldo)}</strong> übrig. Der Grundpreis könnte
                  um <strong>{euro(-anpassung)}</strong> pro Person sinken.
                </>
              )}
            </p>
            <Knopf variante="primaer" onClick={preiseAusgleichen} className="kein-druck">
              Grundpreise anpassen
            </Knopf>
          </div>
        )}
      </Karte>

      <div className="grid gap-4 lg:grid-cols-2">
        <Karte titel="Ausgaben nach Kategorie">
          {kategorien.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Ausgaben erfasst.</p>
          ) : (
            <ul className="space-y-3">
              {kategorien.map(({ kategorie, betrag }) => (
                <li key={kategorie}>
                  <Balken
                    label={AUSGABEN_KATEGORIE_LABEL[kategorie]}
                    betrag={betrag}
                    anteil={betrag / Math.max(k.ausgaben, 1)}
                    farbe="bg-alpen-500"
                  />
                </li>
              ))}
            </ul>
          )}
        </Karte>

        <Karte titel="Deckungsbeitrag und Break-even">
          <dl className="space-y-2 text-sm">
            <Zeile label="Fixkosten (unabhängig von der Personenzahl)" wert={euro(fixkosten)} />
            <Zeile label="Variable Kosten pro Person" wert={euro(variabelProPerson)} />
            <Zeile label="Durchschnittlicher Preis pro Person" wert={euro(einnahmeProPerson)} />
            <Zeile
              label="Deckungsbeitrag pro Person"
              wert={euro(deckungsbeitrag)}
              hervorgehoben
            />
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="text-slate-600">Break-even bei</dt>
              <dd className="font-semibold">
                {breakEvenPersonen === null
                  ? 'nicht erreichbar'
                  : `${breakEvenPersonen} Personen`}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            {breakEvenPersonen === null
              ? 'Der Preis pro Person deckt die variablen Kosten noch nicht – zuerst die Grundpreise oder die variablen Posten anpassen.'
              : `Ab ${breakEvenPersonen} Teilnehmenden tragen die Einnahmen die Fixkosten. Aktuell ${k.personen === 1 ? 'ist 1 Person' : `sind ${k.personen} Personen`} angemeldet.`}
          </p>
        </Karte>
      </div>

      <Karte titel="Zahlungsstand">
        <div className="grid gap-4 sm:grid-cols-3">
          <Kennzahl label="Soll" wert={euro(k.einnahmen)} />
          <Kennzahl label="Eingegangen" wert={euro(k.bereitsBezahlt)} ton="gut" />
          <Kennzahl
            label="Offen"
            wert={euro(k.offeneForderungen)}
            ton={k.offeneForderungen > 0 ? 'warnung' : 'gut'}
          />
        </div>
      </Karte>
    </>
  )
}

function Balken({
  label,
  betrag,
  anteil,
  farbe,
}: {
  label: string
  betrag: number
  anteil: number
  farbe: string
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium tabular-nums">{euro(betrag)}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${farbe}`}
          style={{ width: `${Math.min(100, Math.max(0, anteil * 100))}%` }}
        />
      </div>
    </div>
  )
}

function Zeile({
  label,
  wert,
  hervorgehoben,
}: {
  label: string
  wert: string
  hervorgehoben?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`tabular-nums ${hervorgehoben ? 'font-semibold' : ''}`}>{wert}</dd>
    </div>
  )
}
