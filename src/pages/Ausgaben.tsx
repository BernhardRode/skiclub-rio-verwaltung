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
import { berechneKalkulation } from '../domain/kalkulation'
import {
  AUSGABEN_ART_LABEL,
  AUSGABEN_KATEGORIE_LABEL,
  type Ausgabe,
  type AusgabenArt,
  type AusgabenKategorie,
} from '../domain/types'
import { alsCsv, dateiHerunterladen } from '../lib/csv'
import { datum, euro, plural } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'

type AusgabeEntwurf = Omit<Ausgabe, 'id'>

const leereAusgabe = (): AusgabeEntwurf => ({
  bezeichnung: '',
  kategorie: 'sonstiges',
  art: 'fix',
  betrag: 0,
  bezahlt: false,
  faelligAm: '',
  notiz: '',
})

export function Ausgaben() {
  const daten = useDaten()
  const { ausgabeAnlegen, ausgabeAendern, ausgabeLoeschen } = useAusfahrt()
  const [dialogOffen, setDialogOffen] = useState(false)
  const [bearbeiteId, setBearbeiteId] = useState<string | undefined>()
  const [entwurf, setEntwurf] = useState<AusgabeEntwurf>(leereAusgabe())

  const kalkulation = berechneKalkulation(daten)
  const offeneSumme = kalkulation.ausgabenPosten
    .filter((p) => !p.ausgabe.bezahlt)
    .reduce((s, p) => s + p.summe, 0)

  const oeffnen = (ausgabe?: Ausgabe) => {
    if (ausgabe) {
      const { id: _id, ...rest } = ausgabe
      setBearbeiteId(ausgabe.id)
      setEntwurf(rest)
    } else {
      setBearbeiteId(undefined)
      setEntwurf(leereAusgabe())
    }
    setDialogOffen(true)
  }

  const speichern = () => {
    if (!entwurf.bezeichnung.trim()) return
    if (bearbeiteId) ausgabeAendern(bearbeiteId, entwurf)
    else ausgabeAnlegen(entwurf)
    setDialogOffen(false)
  }

  const csvExport = () => {
    const inhalt = alsCsv(
      ['Bezeichnung', 'Kategorie', 'Abrechnungsart', 'Einzelbetrag', 'Gesamt', 'Bezahlt', 'Fällig'],
      kalkulation.ausgabenPosten.map((p) => [
        p.ausgabe.bezeichnung,
        AUSGABEN_KATEGORIE_LABEL[p.ausgabe.kategorie],
        AUSGABEN_ART_LABEL[p.ausgabe.art],
        p.ausgabe.betrag,
        p.summe,
        p.ausgabe.bezahlt ? 'ja' : 'nein',
        p.ausgabe.faelligAm ?? '',
      ]),
    )
    dateiHerunterladen(inhalt, `ausgaben-galtuer-${daten.ausfahrt.jahr}.csv`)
  }

  return (
    <>
      <Seitenkopf
        titel="Ausgaben"
        beschreibung={`Hochgerechnet auf ${plural(
          kalkulation.personen,
          'zahlende Person',
          'zahlende Personen',
        )} und ${plural(kalkulation.naechte, 'Nacht', 'Nächte')}.`}
        aktion={
          <>
            <Knopf onClick={csvExport} disabled={daten.ausgaben.length === 0}>
              CSV exportieren
            </Knopf>
            <Knopf variante="primaer" onClick={() => oeffnen()}>
              + Ausgabe
            </Knopf>
          </>
        }
      />

      <Karte>
        {daten.ausgaben.length === 0 ? (
          <LeerZustand
            text="Noch keine Ausgaben geplant."
            aktion={
              <Knopf variante="primaer" onClick={() => oeffnen()}>
                Erste Ausgabe anlegen
              </Knopf>
            }
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-2 font-medium">Posten</th>
                  <th className="px-3 py-2 font-medium">Kategorie</th>
                  <th className="px-3 py-2 font-medium">Abrechnung</th>
                  <th className="px-3 py-2 text-right font-medium">Einzelbetrag</th>
                  <th className="px-3 py-2 text-right font-medium">Gesamt</th>
                  <th className="px-3 py-2 font-medium">Bezahlt</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kalkulation.ausgabenPosten.map(({ ausgabe, summe }) => (
                  <tr key={ausgabe.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-900">
                      {ausgabe.bezeichnung}
                      {ausgabe.faelligAm ? (
                        <div className="text-xs font-normal text-slate-500">
                          fällig {datum(ausgabe.faelligAm)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <Etikett>{AUSGABEN_KATEGORIE_LABEL[ausgabe.kategorie]}</Etikett>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {AUSGABEN_ART_LABEL[ausgabe.art]}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {euro(ausgabe.betrag)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {euro(summe)}
                    </td>
                    <td className="px-3 py-2.5">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-slate-300"
                          checked={ausgabe.bezahlt}
                          aria-label={`${ausgabe.bezeichnung} als bezahlt markieren`}
                          onChange={(e) =>
                            ausgabeAendern(ausgabe.id, { bezahlt: e.target.checked })
                          }
                        />
                        {ausgabe.bezahlt ? 'bezahlt' : 'offen'}
                      </label>
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap kein-druck">
                      <Knopf variante="still" onClick={() => oeffnen(ausgabe)}>
                        Bearbeiten
                      </Knopf>
                      <Knopf
                        variante="still"
                        onClick={() =>
                          window.confirm(`„${ausgabe.bezeichnung}“ löschen?`) &&
                          ausgabeLoeschen(ausgabe.id)
                        }
                      >
                        Löschen
                      </Knopf>
                    </td>
                  </tr>
                ))}
                {kalkulation.skipassEinkauf > 0 ? (
                  <tr className="bg-alpen-50/50">
                    <td className="px-5 py-2.5 font-medium text-slate-900">
                      Skipässe (Einkauf)
                      <div className="text-xs font-normal text-slate-500">
                        automatisch aus den zugeordneten Pässen
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Etikett ton="blau">Skipass</Etikett>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">automatisch</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">–</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {euro(kalkulation.skipassEinkauf)}
                    </td>
                    <td className="px-3 py-2.5" colSpan={2} />
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-5 py-2.5" colSpan={4}>
                    Summe aller Ausgaben
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {euro(kalkulation.ausgaben)}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-normal text-slate-500">
                    davon offen {euro(offeneSumme)}
                  </td>
                  <td className="px-5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Karte>

      <Dialog
        offen={dialogOffen}
        titel={bearbeiteId ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
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
          <div className="sm:col-span-2">
            <Feld label="Bezeichnung">
              <Eingabe
                value={entwurf.bezeichnung}
                placeholder="z. B. Halbpension Unterkunft"
                onChange={(e) =>
                  setEntwurf((alt) => ({ ...alt, bezeichnung: e.target.value }))
                }
              />
            </Feld>
          </div>
          <Feld label="Kategorie">
            <Auswahl
              value={entwurf.kategorie}
              onChange={(e) =>
                setEntwurf((alt) => ({
                  ...alt,
                  kategorie: e.target.value as AusgabenKategorie,
                }))
              }
            >
              {Object.entries(AUSGABEN_KATEGORIE_LABEL).map(([wert, label]) => (
                <option key={wert} value={wert}>
                  {label}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld
            label="Abrechnungsart"
            hinweis="Bestimmt, wie der Betrag hochgerechnet wird."
          >
            <Auswahl
              value={entwurf.art}
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, art: e.target.value as AusgabenArt }))
              }
            >
              {Object.entries(AUSGABEN_ART_LABEL).map(([wert, label]) => (
                <option key={wert} value={wert}>
                  {label}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Betrag (€)">
            <Eingabe
              type="number"
              step="0.01"
              value={entwurf.betrag}
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, betrag: Number(e.target.value) || 0 }))
              }
            />
          </Feld>
          <Feld label="Fällig am">
            <Eingabe
              type="date"
              value={entwurf.faelligAm ?? ''}
              onChange={(e) => setEntwurf((alt) => ({ ...alt, faelligAm: e.target.value }))}
            />
          </Feld>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300"
            checked={entwurf.bezahlt}
            onChange={(e) => setEntwurf((alt) => ({ ...alt, bezahlt: e.target.checked }))}
          />
          bereits bezahlt
        </label>
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
