import { Link } from 'react-router-dom'
import { Etikett, Karte, Kennzahl, Knopf, Seitenkopf } from '../components/ui'
import {
  berechneKalkulation,
  berechneTeilnehmerpreis,
  berechneZimmerbelegung,
  istZahlend,
  ohneZimmer,
} from '../domain/kalkulation'
import { STATUS_LABEL, type TeilnehmerStatus } from '../domain/types'
import { datumLang, euro, plural } from '../lib/format'
import { useDaten } from '../store/useAusfahrt'

export function Uebersicht() {
  const daten = useDaten()
  const k = berechneKalkulation(daten)
  const belegungen = berechneZimmerbelegung(daten.zimmer, daten.teilnehmer)
  const bettenGesamt = daten.zimmer.reduce((summe, z) => summe + z.betten, 0)
  const bettenBelegt = belegungen.reduce((summe, b) => summe + b.belegt.length, 0)

  const nachStatus = (Object.keys(STATUS_LABEL) as TeilnehmerStatus[]).map((status) => ({
    status,
    anzahl: daten.teilnehmer.filter((t) => t.status === status).length,
  }))

  const offeneZahler = daten.teilnehmer
    .filter(istZahlend)
    .map((t) => ({ teilnehmer: t, preis: berechneTeilnehmerpreis(t, daten) }))
    .filter(({ preis }) => preis.offen > 0)
    .sort((a, b) => b.preis.offen - a.preis.offen)

  const aufgaben = [
    {
      erledigt: daten.zimmer.length > 0,
      text: 'Zimmer der Unterkunft anlegen',
      ziel: '/zimmer',
    },
    {
      erledigt: ohneZimmer(daten.teilnehmer).length === 0 && daten.teilnehmer.length > 0,
      text: 'Alle Anmeldungen einem Zimmer zuordnen',
      ziel: '/zimmer',
    },
    {
      erledigt: daten.teilnehmer.filter((t) => istZahlend(t) && !t.skipassTypId).length === 0,
      text: 'Skipässe zuordnen und bestellen',
      ziel: '/skipaesse',
    },
    {
      erledigt: Math.abs(k.saldo) < 1 && k.personen > 0,
      text: 'Kalkulation auf Null bringen',
      ziel: '/kalkulation',
    },
    {
      erledigt: offeneZahler.length === 0 && k.personen > 0,
      text: 'Alle Teilnehmerbeiträge einsammeln',
      ziel: '/anmeldungen',
    },
  ]

  return (
    <>
      <Seitenkopf
        titel={daten.ausfahrt.titel}
        beschreibung={`${daten.ausfahrt.ort} · ${datumLang(daten.ausfahrt.anreise)} bis ${datumLang(
          daten.ausfahrt.abreise,
        )} · ${plural(k.naechte, 'Nacht', 'Nächte')}`}
        aktion={
          <Link to="/anmeldungen">
            <Knopf variante="primaer">Anmeldungen öffnen</Knopf>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl
          label="Anmeldungen"
          wert={String(k.personen)}
          zusatz={`${daten.teilnehmer.filter((t) => t.status === 'warteliste').length} auf Warteliste`}
        />
        <Kennzahl
          label="Betten belegt"
          wert={`${bettenBelegt} / ${bettenGesamt}`}
          zusatz={`${plural(ohneZimmer(daten.teilnehmer).length, 'Person', 'Personen')} ohne Zimmer`}
          ton={bettenGesamt > 0 && bettenBelegt > bettenGesamt ? 'schlecht' : 'neutral'}
        />
        <Kennzahl
          label="Saldo"
          wert={euro(k.saldo)}
          ton={Math.abs(k.saldo) < 1 ? 'gut' : k.saldo < 0 ? 'schlecht' : 'warnung'}
          zusatz={`${euro(k.einnahmen)} Einnahmen · ${euro(k.ausgaben)} Ausgaben`}
        />
        <Kennzahl
          label="Offene Beiträge"
          wert={euro(k.offeneForderungen)}
          ton={k.offeneForderungen > 0 ? 'warnung' : 'gut'}
          zusatz={`${plural(offeneZahler.length, 'Person', 'Personen')}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Karte titel="Nächste Schritte">
          <ul className="space-y-2">
            {aufgaben.map((aufgabe) => (
              <li key={aufgabe.text}>
                <Link
                  to={aufgabe.ziel}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      aufgabe.erledigt
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {aufgabe.erledigt ? '✓' : ''}
                  </span>
                  <span
                    className={aufgabe.erledigt ? 'text-slate-400 line-through' : 'text-slate-700'}
                  >
                    {aufgabe.text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Karte>

        <Karte titel="Anmeldestatus">
          <ul className="space-y-2 text-sm">
            {nachStatus.map(({ status, anzahl }) => (
              <li key={status} className="flex items-center justify-between">
                <Etikett
                  ton={
                    status === 'bestaetigt'
                      ? 'gruen'
                      : status === 'warteliste'
                        ? 'gelb'
                        : status === 'storniert'
                          ? 'rot'
                          : 'blau'
                  }
                >
                  {STATUS_LABEL[status]}
                </Etikett>
                <span className="font-medium tabular-nums">{anzahl}</span>
              </li>
            ))}
          </ul>
          {daten.ausfahrt.anmeldeschluss ? (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Anmeldeschluss: {datumLang(daten.ausfahrt.anmeldeschluss)}
            </p>
          ) : null}
        </Karte>
      </div>

      {offeneZahler.length > 0 ? (
        <Karte
          titel="Offene Beiträge"
          aktion={
            <Link to="/anmeldungen" className="text-sm text-alpen-600 hover:underline">
              alle anzeigen
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100 text-sm">
            {offeneZahler.slice(0, 8).map(({ teilnehmer, preis }) => (
              <li key={teilnehmer.id} className="flex items-center justify-between py-2">
                <span>
                  {teilnehmer.vorname} {teilnehmer.nachname}
                </span>
                <span className="tabular-nums text-amber-600">{euro(preis.offen)}</span>
              </li>
            ))}
          </ul>
        </Karte>
      ) : null}
    </>
  )
}
