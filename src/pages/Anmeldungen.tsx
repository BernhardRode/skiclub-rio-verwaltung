import { useMemo, useState } from 'react'
import { TeilnehmerDialog } from '../components/TeilnehmerDialog'
import { Auswahl, Eingabe, Etikett, Karte, Knopf, LeerZustand, Seitenkopf } from '../components/ui'
import { berechneTeilnehmerpreis } from '../domain/kalkulation'
import {
  ALTERSGRUPPE_LABEL,
  STATUS_LABEL,
  type Teilnehmer,
  type TeilnehmerStatus,
} from '../domain/types'
import { alsCsv, dateiHerunterladen } from '../lib/csv'
import { euro } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'

const statusTon: Record<TeilnehmerStatus, 'grau' | 'blau' | 'gruen' | 'gelb' | 'rot'> = {
  angemeldet: 'blau',
  bestaetigt: 'gruen',
  warteliste: 'gelb',
  storniert: 'rot',
}

export function Anmeldungen() {
  const daten = useDaten()
  const { teilnehmerLoeschen } = useAusfahrt()
  const [suche, setSuche] = useState('')
  const [statusFilter, setStatusFilter] = useState<TeilnehmerStatus | 'alle'>('alle')
  const [zahlungsFilter, setZahlungsFilter] = useState<'alle' | 'offen' | 'bezahlt'>('alle')
  const [dialogOffen, setDialogOffen] = useState(false)
  const [bearbeiteId, setBearbeiteId] = useState<string | undefined>()

  const zeilen = useMemo(() => {
    const begriff = suche.trim().toLowerCase()
    return daten.teilnehmer
      .map((teilnehmer) => ({
        teilnehmer,
        preis: berechneTeilnehmerpreis(teilnehmer, daten),
      }))
      .filter(({ teilnehmer, preis }) => {
        if (statusFilter !== 'alle' && teilnehmer.status !== statusFilter) return false
        if (zahlungsFilter === 'offen' && preis.offen <= 0) return false
        if (zahlungsFilter === 'bezahlt' && preis.offen > 0) return false
        if (!begriff) return true
        return `${teilnehmer.vorname} ${teilnehmer.nachname} ${teilnehmer.email ?? ''}`
          .toLowerCase()
          .includes(begriff)
      })
      .sort((a, b) =>
        `${a.teilnehmer.nachname}${a.teilnehmer.vorname}`.localeCompare(
          `${b.teilnehmer.nachname}${b.teilnehmer.vorname}`,
          'de',
        ),
      )
  }, [daten, suche, statusFilter, zahlungsFilter])

  const summe = zeilen.reduce(
    (akku, { preis }) => ({
      gesamt: akku.gesamt + preis.gesamt,
      bezahlt: akku.bezahlt + preis.bezahlt,
      offen: akku.offen + preis.offen,
    }),
    { gesamt: 0, bezahlt: 0, offen: 0 },
  )

  const oeffnen = (id?: string) => {
    setBearbeiteId(id)
    setDialogOffen(true)
  }

  const loeschen = (teilnehmer: Teilnehmer) => {
    const sicher = window.confirm(
      `Anmeldung von ${teilnehmer.vorname} ${teilnehmer.nachname} wirklich löschen? Das lässt sich nicht rückgängig machen.`,
    )
    if (sicher) teilnehmerLoeschen(teilnehmer.id)
  }

  const csvExport = () => {
    const inhalt = alsCsv(
      [
        'Nachname',
        'Vorname',
        'E-Mail',
        'Telefon',
        'Geburtsdatum',
        'Altersgruppe',
        'Mitglied',
        'Status',
        'Zimmer',
        'Skipass',
        'Gesamtpreis',
        'Bezahlt',
        'Offen',
        'Notiz',
      ],
      zeilen.map(({ teilnehmer, preis }) => [
        teilnehmer.nachname,
        teilnehmer.vorname,
        teilnehmer.email ?? '',
        teilnehmer.telefon ?? '',
        teilnehmer.geburtsdatum ?? '',
        ALTERSGRUPPE_LABEL[teilnehmer.altersgruppe],
        teilnehmer.mitglied ? 'ja' : 'nein',
        STATUS_LABEL[teilnehmer.status],
        daten.zimmer.find((z) => z.id === teilnehmer.zimmerId)?.bezeichnung ?? '',
        daten.skipassTypen.find((s) => s.id === teilnehmer.skipassTypId)?.bezeichnung ?? '',
        preis.gesamt,
        preis.bezahlt,
        preis.offen,
        teilnehmer.notiz ?? '',
      ]),
    )
    dateiHerunterladen(inhalt, `anmeldungen-galtuer-${daten.ausfahrt.jahr}.csv`)
  }

  return (
    <>
      <Seitenkopf
        titel="Anmeldungen"
        beschreibung="Alle Teilnehmerinnen und Teilnehmer der Ausfahrt mit Preis, Zahlungsstand und Zuordnungen."
        aktion={
          <>
            <Knopf onClick={csvExport} disabled={zeilen.length === 0}>
              CSV exportieren
            </Knopf>
            <Knopf variante="primaer" onClick={() => oeffnen(undefined)}>
              + Anmeldung
            </Knopf>
          </>
        }
      />

      <Karte>
        <div className="grid gap-3 sm:grid-cols-3">
          <Eingabe
            placeholder="Suche nach Name oder E-Mail …"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />
          <Auswahl
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TeilnehmerStatus | 'alle')}
          >
            <option value="alle">Alle Status</option>
            {Object.entries(STATUS_LABEL).map(([wert, label]) => (
              <option key={wert} value={wert}>
                {label}
              </option>
            ))}
          </Auswahl>
          <Auswahl
            value={zahlungsFilter}
            onChange={(e) =>
              setZahlungsFilter(e.target.value as 'alle' | 'offen' | 'bezahlt')
            }
          >
            <option value="alle">Alle Zahlungen</option>
            <option value="offen">Nur offene Beträge</option>
            <option value="bezahlt">Nur vollständig bezahlt</option>
          </Auswahl>
        </div>

        <div className="mt-4 -mx-5 overflow-x-auto">
          {zeilen.length === 0 ? (
            <div className="px-5">
              <LeerZustand
                text={
                  daten.teilnehmer.length === 0
                    ? 'Noch keine Anmeldungen erfasst.'
                    : 'Keine Anmeldung passt zu den Filtern.'
                }
                aktion={
                  daten.teilnehmer.length === 0 ? (
                    <Knopf variante="primaer" onClick={() => oeffnen(undefined)}>
                      Erste Anmeldung anlegen
                    </Knopf>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Gruppe</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Zimmer</th>
                  <th className="px-3 py-2 font-medium">Skipass</th>
                  <th className="px-3 py-2 text-right font-medium">Preis</th>
                  <th className="px-3 py-2 text-right font-medium">Offen</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zeilen.map(({ teilnehmer, preis }) => (
                  <tr key={teilnehmer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <button
                        type="button"
                        className="text-left font-medium text-slate-900 hover:text-alpen-600"
                        onClick={() => oeffnen(teilnehmer.id)}
                      >
                        {teilnehmer.nachname}, {teilnehmer.vorname}
                      </button>
                      {teilnehmer.email ? (
                        <div className="text-xs text-slate-500">{teilnehmer.email}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <Etikett>{ALTERSGRUPPE_LABEL[teilnehmer.altersgruppe]}</Etikett>
                        {teilnehmer.mitglied ? null : <Etikett ton="gelb">Gast</Etikett>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Etikett ton={statusTon[teilnehmer.status]}>
                        {STATUS_LABEL[teilnehmer.status]}
                      </Etikett>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {daten.zimmer.find((z) => z.id === teilnehmer.zimmerId)
                        ?.bezeichnung ?? <span className="text-slate-400">–</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {daten.skipassTypen.find((s) => s.id === teilnehmer.skipassTypId)
                        ?.bezeichnung ?? <span className="text-slate-400">–</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {euro(preis.gesamt)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        preis.offen > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {euro(preis.offen)}
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap kein-druck">
                      <Knopf variante="still" onClick={() => oeffnen(teilnehmer.id)}>
                        Bearbeiten
                      </Knopf>
                      <Knopf variante="still" onClick={() => loeschen(teilnehmer)}>
                        Löschen
                      </Knopf>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-5 py-2.5" colSpan={5}>
                    {zeilen.length} {zeilen.length === 1 ? 'Person' : 'Personen'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {euro(summe.gesamt)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {euro(summe.offen)}
                  </td>
                  <td className="px-5" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Karte>

      <TeilnehmerDialog
        offen={dialogOffen}
        teilnehmerId={bearbeiteId}
        onSchliessen={() => setDialogOffen(false)}
      />
    </>
  )
}
