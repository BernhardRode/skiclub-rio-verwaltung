import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import {
  Auswahl,
  Eingabe,
  Etikett,
  Feld,
  Karte,
  Knopf,
  LeerZustand,
  Seitenkopf,
  Textfeld,
} from '../components/ui'
import { berechneZimmerbelegung, ohneZimmer } from '../domain/kalkulation'
import { ALTERSGRUPPE_LABEL, type Zimmer as ZimmerTyp } from '../domain/types'
import { alsCsv, dateiHerunterladen } from '../lib/csv'
import { euro, plural } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'

type ZimmerEntwurf = Omit<ZimmerTyp, 'id'>

const leeresZimmer = (): ZimmerEntwurf => ({
  bezeichnung: '',
  haus: '',
  kategorie: 'Doppelzimmer',
  betten: 2,
  zuschlagProPerson: 0,
  notiz: '',
})

export function Zimmer() {
  const daten = useDaten()
  const { zimmerAnlegen, zimmerAendern, zimmerLoeschen, zimmerZuordnen } = useAusfahrt()
  const [dialogOffen, setDialogOffen] = useState(false)
  const [bearbeiteId, setBearbeiteId] = useState<string | undefined>()
  const [entwurf, setEntwurf] = useState<ZimmerEntwurf>(leeresZimmer())

  const belegungen = berechneZimmerbelegung(daten.zimmer, daten.teilnehmer)
  const nichtZugeordnet = ohneZimmer(daten.teilnehmer)
  const bettenGesamt = daten.zimmer.reduce((summe, z) => summe + z.betten, 0)
  const bettenBelegt = belegungen.reduce((summe, b) => summe + b.belegt.length, 0)

  const oeffnen = (zimmer?: ZimmerTyp) => {
    if (zimmer) {
      const { id: _id, ...rest } = zimmer
      setBearbeiteId(zimmer.id)
      setEntwurf(rest)
    } else {
      setBearbeiteId(undefined)
      setEntwurf(leeresZimmer())
    }
    setDialogOffen(true)
  }

  const speichern = () => {
    if (!entwurf.bezeichnung.trim()) return
    if (bearbeiteId) zimmerAendern(bearbeiteId, entwurf)
    else zimmerAnlegen(entwurf)
    setDialogOffen(false)
  }

  const loeschen = (zimmer: ZimmerTyp) => {
    const belegt = daten.teilnehmer.filter((t) => t.zimmerId === zimmer.id).length
    const frage = belegt
      ? `„${zimmer.bezeichnung}“ löschen? ${plural(belegt, 'Zuordnung wird', 'Zuordnungen werden')} aufgehoben.`
      : `„${zimmer.bezeichnung}“ löschen?`
    if (window.confirm(frage)) zimmerLoeschen(zimmer.id)
  }

  const csvExport = () => {
    const inhalt = alsCsv(
      ['Zimmer', 'Haus', 'Kategorie', 'Betten', 'Belegt', 'Bewohner'],
      belegungen.map((b) => [
        b.zimmer.bezeichnung,
        b.zimmer.haus ?? '',
        b.zimmer.kategorie,
        b.zimmer.betten,
        b.belegt.length,
        b.belegt.map((t) => `${t.vorname} ${t.nachname}`).join(', '),
      ]),
    )
    dateiHerunterladen(inhalt, `zimmerplan-galtuer-${daten.ausfahrt.jahr}.csv`)
  }

  return (
    <>
      <Seitenkopf
        titel="Zimmerbelegung"
        beschreibung={`${bettenBelegt} von ${bettenGesamt} Betten belegt · ${plural(
          nichtZugeordnet.length,
          'Person',
          'Personen',
        )} ohne Zimmer.`}
        aktion={
          <>
            <Knopf onClick={csvExport} disabled={daten.zimmer.length === 0}>
              Zimmerplan als CSV
            </Knopf>
            <Knopf variante="primaer" onClick={() => oeffnen()}>
              + Zimmer
            </Knopf>
          </>
        }
      />

      <Karte titel={`Ohne Zimmer (${nichtZugeordnet.length})`}>
        {nichtZugeordnet.length === 0 ? (
          <p className="text-sm text-emerald-600">
            Alle angemeldeten Personen haben ein Zimmer.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {nichtZugeordnet.map((teilnehmer) => (
              <li
                key={teilnehmer.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-1.5 pl-3 text-sm"
              >
                <span>
                  {teilnehmer.vorname} {teilnehmer.nachname}
                </span>
                <span className="text-xs text-slate-500">
                  {ALTERSGRUPPE_LABEL[teilnehmer.altersgruppe]}
                </span>
                <Auswahl
                  className="w-40 py-1 text-xs kein-druck"
                  value=""
                  aria-label={`Zimmer für ${teilnehmer.vorname} ${teilnehmer.nachname}`}
                  onChange={(e) =>
                    e.target.value && zimmerZuordnen(teilnehmer.id, e.target.value)
                  }
                >
                  <option value="">Zimmer wählen …</option>
                  {belegungen.map((b) => (
                    <option key={b.zimmer.id} value={b.zimmer.id}>
                      {b.zimmer.bezeichnung} ({b.freieBetten} frei)
                    </option>
                  ))}
                </Auswahl>
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {daten.zimmer.length === 0 ? (
        <Karte>
          <LeerZustand
            text="Noch keine Zimmer angelegt. Lege die Zimmer der Unterkunft an, um die Belegung zu planen."
            aktion={
              <Knopf variante="primaer" onClick={() => oeffnen()}>
                Erstes Zimmer anlegen
              </Knopf>
            }
          />
        </Karte>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {belegungen.map((belegung) => (
            <section
              key={belegung.zimmer.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                belegung.ueberbelegt ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {belegung.zimmer.bezeichnung}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {[belegung.zimmer.haus, belegung.zimmer.kategorie]
                      .filter(Boolean)
                      .join(' · ')}
                    {belegung.zimmer.zuschlagProPerson
                      ? ` · ${euro(belegung.zimmer.zuschlagProPerson)} Zuschlag`
                      : ''}
                  </p>
                </div>
                {belegung.ueberbelegt ? (
                  <Etikett ton="rot">überbelegt</Etikett>
                ) : belegung.freieBetten === 0 ? (
                  <Etikett ton="gruen">voll</Etikett>
                ) : (
                  <Etikett ton="blau">{belegung.freieBetten} frei</Etikett>
                )}
              </header>

              <ul className="mt-3 space-y-1">
                {Array.from({ length: Math.max(belegung.zimmer.betten, belegung.belegt.length) }).map(
                  (_, index) => {
                    const person = belegung.belegt[index]
                    return (
                      <li
                        key={person?.id ?? `frei-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm"
                      >
                        {person ? (
                          <>
                            <span>
                              {person.vorname} {person.nachname}
                              <span className="ml-1.5 text-xs text-slate-500">
                                {ALTERSGRUPPE_LABEL[person.altersgruppe]}
                              </span>
                            </span>
                            <Knopf
                              variante="still"
                              className="px-2 py-0.5 kein-druck"
                              aria-label={`${person.vorname} ${person.nachname} aus Zimmer entfernen`}
                              onClick={() => zimmerZuordnen(person.id, undefined)}
                            >
                              ✕
                            </Knopf>
                          </>
                        ) : (
                          <span className="text-slate-400">Bett frei</span>
                        )}
                      </li>
                    )
                  },
                )}
              </ul>

              {nichtZugeordnet.length > 0 ? (
                <Auswahl
                  className="mt-3 py-1.5 text-xs kein-druck"
                  value=""
                  aria-label={`Person in ${belegung.zimmer.bezeichnung} einbuchen`}
                  onChange={(e) =>
                    e.target.value && zimmerZuordnen(e.target.value, belegung.zimmer.id)
                  }
                >
                  <option value="">+ Person einbuchen …</option>
                  {nichtZugeordnet.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.vorname} {t.nachname}
                    </option>
                  ))}
                </Auswahl>
              ) : null}

              {belegung.zimmer.notiz ? (
                <p className="mt-3 text-xs text-slate-500">{belegung.zimmer.notiz}</p>
              ) : null}

              <div className="mt-3 flex gap-1 kein-druck">
                <Knopf variante="still" onClick={() => oeffnen(belegung.zimmer)}>
                  Bearbeiten
                </Knopf>
                <Knopf variante="still" onClick={() => loeschen(belegung.zimmer)}>
                  Löschen
                </Knopf>
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog
        offen={dialogOffen}
        titel={bearbeiteId ? 'Zimmer bearbeiten' : 'Neues Zimmer'}
        onSchliessen={() => setDialogOffen(false)}
        fuss={
          <>
            <Knopf onClick={() => setDialogOffen(false)}>Abbrechen</Knopf>
            <Knopf variante="primaer" onClick={speichern}>
              Speichern
            </Knopf>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Bezeichnung">
            <Eingabe
              value={entwurf.bezeichnung}
              placeholder="z. B. Zimmer 204"
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, bezeichnung: e.target.value }))
              }
            />
          </Feld>
          <Feld label="Haus / Gebäude">
            <Eingabe
              value={entwurf.haus ?? ''}
              placeholder="z. B. Haupthaus"
              onChange={(e) => setEntwurf((alt) => ({ ...alt, haus: e.target.value }))}
            />
          </Feld>
          <Feld label="Kategorie">
            <Eingabe
              value={entwurf.kategorie}
              placeholder="Doppelzimmer, Appartement …"
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, kategorie: e.target.value }))
              }
            />
          </Feld>
          <Feld label="Betten">
            <Eingabe
              type="number"
              min={1}
              value={entwurf.betten}
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, betten: Number(e.target.value) || 1 }))
              }
            />
          </Feld>
          <Feld
            label="Zuschlag pro Person (€)"
            hinweis="Negativ für Nachlass, z. B. bei Mehrbettzimmern."
          >
            <Eingabe
              type="number"
              step="0.01"
              value={entwurf.zuschlagProPerson}
              onChange={(e) =>
                setEntwurf((alt) => ({
                  ...alt,
                  zuschlagProPerson: Number(e.target.value) || 0,
                }))
              }
            />
          </Feld>
        </div>
        <div className="mt-4">
          <Feld label="Notiz">
            <Textfeld
              rows={2}
              value={entwurf.notiz ?? ''}
              onChange={(e) => setEntwurf((alt) => ({ ...alt, notiz: e.target.value }))}
            />
          </Feld>
        </div>
      </Dialog>
    </>
  )
}
