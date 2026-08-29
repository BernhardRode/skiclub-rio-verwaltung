import { useRef, useState } from 'react'
import { ALTERSGRUPPE_LABEL } from '../domain/types'
import { leseTeilnehmerliste, type ImportErgebnis } from '../lib/listenImport'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'
import { Dialog } from './Dialog'
import { Etikett, Knopf } from './ui'

export function ListenImportDialog({
  offen,
  onSchliessen,
}: {
  offen: boolean
  onSchliessen: () => void
}) {
  const daten = useDaten()
  const { teilnehmerlisteUebernehmen } = useAusfahrt()
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null)
  const [fehler, setFehler] = useState('')
  const [zimmerAnlegen, setZimmerAnlegen] = useState(true)
  const [ersetzen, setErsetzen] = useState(false)

  const schliessen = () => {
    setErgebnis(null)
    setFehler('')
    onSchliessen()
  }

  const einlesen = async (datei: File) => {
    setFehler('')
    setErgebnis(null)
    try {
      const text = await datei.text()
      setErgebnis(
        leseTeilnehmerliste(
          text,
          daten.zimmer.map((z) => z.bezeichnung),
        ),
      )
    } catch (problem) {
      setFehler(problem instanceof Error ? problem.message : 'Unbekannter Fehler.')
    } finally {
      if (dateiFeld.current) dateiFeld.current.value = ''
    }
  }

  const uebernehmen = () => {
    if (!ergebnis) return
    if (
      ersetzen &&
      daten.teilnehmer.length > 0 &&
      !window.confirm(
        `Die bestehenden ${daten.teilnehmer.length} Anmeldungen werden ersetzt. Fortfahren?`,
      )
    ) {
      return
    }
    teilnehmerlisteUebernehmen(ergebnis.teilnehmer, { zimmerAnlegen, ersetzen })
    schliessen()
  }

  return (
    <Dialog
      offen={offen}
      breit
      titel="Teilnehmerliste importieren"
      onSchliessen={schliessen}
      fuss={
        <>
          <Knopf onClick={schliessen}>Abbrechen</Knopf>
          <Knopf variante="primaer" disabled={!ergebnis} onClick={uebernehmen}>
            {ergebnis
              ? `${ergebnis.teilnehmer.length} Anmeldungen übernehmen`
              : 'Übernehmen'}
          </Knopf>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            Übernimmt eine bestehende Liste als CSV – etwa die Teilnehmerliste des
            Vorjahres, aus Excel über <em>Datei → Speichern unter → CSV</em>.
          </p>
          <p className="mt-2">
            Erkannt werden die Spalten <strong>Name</strong> (oder Vorname/Nachname),{' '}
            <strong>Tarif</strong>, <strong>Zimmer</strong>, <strong>Essen</strong>,{' '}
            <strong>E-Mail</strong>, <strong>Telefon</strong> und{' '}
            <strong>Geburtsdatum</strong>. Namen im Format „Nachname, Vorname“ werden
            getrennt, Tarifangaben wie „Mitglied, Jugend“, „Nicht-Mitglied“ oder
            „Kostenlos“ automatisch gedeutet.
          </p>
        </div>

        <div>
          <Knopf variante="primaer" onClick={() => dateiFeld.current?.click()}>
            CSV-Datei wählen
          </Knopf>
          <input
            ref={dateiFeld}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const datei = e.target.files?.[0]
              if (datei) void einlesen(datei)
            }}
          />
        </div>

        {fehler ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fehler}</p>
        ) : null}

        {ergebnis ? (
          <>
            {ergebnis.warnungen.map((warnung) => (
              <p
                key={warnung}
                className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                {warnung}
              </p>
            ))}

            {ergebnis.neueZimmer.length > 0 ? (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-700">
                  {ergebnis.neueZimmer.length} neue Zimmerbezeichnung(en) in der Liste:
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ergebnis.neueZimmer.map((zimmer) => (
                    <Etikett key={zimmer}>{zimmer}</Etikett>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300"
                    checked={zimmerAnlegen}
                    onChange={(e) => setZimmerAnlegen(e.target.checked)}
                  />
                  Zimmer anlegen und Personen zuordnen (Bettenzahl aus der Belegung)
                </label>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={ersetzen}
                onChange={(e) => setErsetzen(e.target.checked)}
              />
              Bestehende Anmeldungen ersetzen statt ergänzen
            </label>

            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th className="px-5 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Tarif</th>
                    <th className="px-3 py-2 font-medium">Zimmer</th>
                    <th className="px-5 py-2 font-medium">Essen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ergebnis.teilnehmer.slice(0, 12).map((person, index) => (
                    <tr key={`${person.nachname}-${person.vorname}-${index}`}>
                      <td className="px-5 py-2">
                        {[person.nachname, person.vorname].filter(Boolean).join(', ')}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Etikett>{ALTERSGRUPPE_LABEL[person.altersgruppe]}</Etikett>
                          {person.mitglied ? null : <Etikett ton="gelb">Gast</Etikett>}
                          {person.beitragsfrei ? (
                            <Etikett ton="gruen">kostenlos</Etikett>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {person.zimmerBezeichnung ?? '–'}
                      </td>
                      <td className="px-5 py-2 text-slate-600">
                        {person.verpflegung ?? '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ergebnis.teilnehmer.length > 12 ? (
              <p className="text-xs text-slate-500">
                … und {ergebnis.teilnehmer.length - 12} weitere.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
