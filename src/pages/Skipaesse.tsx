import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import {
  Eingabe,
  Etikett,
  ExternerLink,
  Feld,
  Karte,
  Knopf,
  LeerZustand,
  Seitenkopf,
  Textfeld,
} from '../components/ui'
import { SKIPASS_QUELLE } from '../domain/defaults'
import { berechneSkipassBedarf, istZahlend } from '../domain/kalkulation'
import {
  ALTERSGRUPPEN,
  ALTERSGRUPPE_LABEL,
  type Altersgruppe,
  type SkipassTyp,
} from '../domain/types'
import { alsCsv, dateiHerunterladen } from '../lib/csv'
import { datum, euro, plural } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'

type SkipassEntwurf = Omit<SkipassTyp, 'id'>

const leererPass = (): SkipassEntwurf => ({
  bezeichnung: '',
  tage: 6,
  ekPreis: 0,
  vkPreis: 0,
  altersgruppen: [],
  notiz: '',
})

export function Skipaesse() {
  const daten = useDaten()
  const { skipassAnlegen, skipassAendern, skipassLoeschen, setzePreise } = useAusfahrt()
  const [dialogOffen, setDialogOffen] = useState(false)
  const [bearbeiteId, setBearbeiteId] = useState<string | undefined>()
  const [entwurf, setEntwurf] = useState<SkipassEntwurf>(leererPass())

  const bedarf = berechneSkipassBedarf(daten.teilnehmer, daten.skipassTypen)
  const ohnePass = daten.teilnehmer.filter((t) => istZahlend(t) && !t.skipassTypId)
  const summeEk = bedarf.reduce((s, b) => s + b.ekSumme, 0)
  const summeVk = bedarf.reduce((s, b) => s + b.vkSumme, 0)
  const ohnePreis = daten.skipassTypen.filter((t) => t.ekPreis === 0 && t.vkPreis === 0)
  const preisstand = daten.preise.skipassPreisstand

  const oeffnen = (typ?: SkipassTyp) => {
    if (typ) {
      const { id: _id, ...rest } = typ
      setBearbeiteId(typ.id)
      setEntwurf(rest)
    } else {
      setBearbeiteId(undefined)
      setEntwurf(leererPass())
    }
    setDialogOffen(true)
  }

  const speichern = () => {
    if (!entwurf.bezeichnung.trim()) return
    if (bearbeiteId) skipassAendern(bearbeiteId, entwurf)
    else skipassAnlegen(entwurf)
    setDialogOffen(false)
  }

  const loeschen = (typ: SkipassTyp) => {
    const zugeordnet = daten.teilnehmer.filter((t) => t.skipassTypId === typ.id).length
    const frage = zugeordnet
      ? `„${typ.bezeichnung}“ löschen? ${plural(zugeordnet, 'Zuordnung wird', 'Zuordnungen werden')} aufgehoben.`
      : `„${typ.bezeichnung}“ löschen?`
    if (window.confirm(frage)) skipassLoeschen(typ.id)
  }

  const bestellliste = () => {
    const inhalt = alsCsv(
      ['Skipass', 'Tage', 'Anzahl', 'EK je Pass', 'EK gesamt', 'VK je Pass', 'VK gesamt'],
      bedarf.map((b) => [
        b.typ.bezeichnung,
        b.typ.tage,
        b.anzahl,
        b.typ.ekPreis,
        b.ekSumme,
        b.typ.vkPreis,
        b.vkSumme,
      ]),
    )
    dateiHerunterladen(inhalt, `skipass-bestellung-galtuer-${daten.ausfahrt.jahr}.csv`)
  }

  const gruppeUmschalten = (gruppe: Altersgruppe) =>
    setEntwurf((alt) => ({
      ...alt,
      altersgruppen: alt.altersgruppen.includes(gruppe)
        ? alt.altersgruppen.filter((g) => g !== gruppe)
        : [...alt.altersgruppen, gruppe],
    }))

  return (
    <>
      <Seitenkopf
        titel="Skipässe"
        beschreibung="Passtypen mit Einkaufs- und Verkaufspreis. Der Einkauf fließt automatisch in die Kalkulation ein."
        aktion={
          <>
            <Knopf onClick={bestellliste} disabled={daten.skipassTypen.length === 0}>
              Bestellliste als CSV
            </Knopf>
            <Knopf variante="primaer" onClick={() => oeffnen()}>
              + Passtyp
            </Knopf>
          </>
        }
      />

      <Karte titel="Preisliste der Bergbahnen">
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            Die Tarife für den Silvapark Galtür ändern sich jede Saison. Maßgeblich ist
            immer die offizielle Preisliste – die App rechnet nur mit den Preisen, die
            hier eingetragen sind.
          </p>
          <p>
            <ExternerLink href={SKIPASS_QUELLE.url}>{SKIPASS_QUELLE.name}</ExternerLink>
          </p>
          <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-3">
            <div className="w-52">
              <Feld label="Preise geprüft am">
                <Eingabe
                  type="date"
                  value={preisstand ?? ''}
                  onChange={(e) =>
                    setzePreise({ skipassPreisstand: e.target.value || undefined })
                  }
                />
              </Feld>
            </div>
            <p className="pb-2 text-slate-600">
              {preisstand
                ? `Zuletzt geprüft am ${datum(preisstand)}.`
                : 'Noch nicht geprüft – bitte nach dem Eintragen der Preise setzen.'}
            </p>
          </div>
        </div>
      </Karte>

      {ohnePreis.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bei <strong>{ohnePreis.length}</strong> von {daten.skipassTypen.length} Passtypen
          fehlt noch der Preis:{' '}
          {ohnePreis.map((t) => t.bezeichnung).join(', ')}. Solange dort 0 € steht, fehlen
          die Skipässe in der Kalkulation.
        </div>
      ) : null}

      {ohnePass.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{ohnePass.length}</strong>{' '}
          {ohnePass.length === 1
            ? 'angemeldete Person hat'
            : 'angemeldete Personen haben'}{' '}
          noch keinen Skipass zugeordnet:{' '}
          {ohnePass
            .slice(0, 8)
            .map((t) => `${t.vorname} ${t.nachname}`)
            .join(', ')}
          {ohnePass.length > 8 ? ` und ${ohnePass.length - 8} weitere` : ''}.
        </div>
      ) : null}

      <Karte titel="Passtypen und Bedarf">
        {daten.skipassTypen.length === 0 ? (
          <LeerZustand
            text="Noch keine Skipass-Typen angelegt."
            aktion={
              <Knopf variante="primaer" onClick={() => oeffnen()}>
                Passtyp anlegen
              </Knopf>
            }
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-2 font-medium">Passtyp</th>
                  <th className="px-3 py-2 font-medium">Gültig für</th>
                  <th className="px-3 py-2 text-right font-medium">Tage</th>
                  <th className="px-3 py-2 text-right font-medium">Anzahl</th>
                  <th className="px-3 py-2 text-right font-medium">Einkauf</th>
                  <th className="px-3 py-2 text-right font-medium">Verkauf</th>
                  <th className="px-3 py-2 text-right font-medium">Differenz</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bedarf.map((b) => (
                  <tr key={b.typ.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-900">
                      {b.typ.bezeichnung}
                      {b.typ.notiz ? (
                        <div className="text-xs font-normal text-slate-500">
                          {b.typ.notiz}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {b.typ.altersgruppen.length === 0 ? (
                          <Etikett>alle</Etikett>
                        ) : (
                          b.typ.altersgruppen.map((g) => (
                            <Etikett key={g}>{ALTERSGRUPPE_LABEL[g]}</Etikett>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{b.typ.tage}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {b.anzahl}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {euro(b.ekSumme)}
                      <div className="text-xs text-slate-500">
                        à {euro(b.typ.ekPreis)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {euro(b.vkSumme)}
                      <div className="text-xs text-slate-500">
                        à {euro(b.typ.vkPreis)}
                      </div>
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        b.marge < 0
                          ? 'text-red-600'
                          : b.marge > 0
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                      }`}
                    >
                      {euro(b.marge)}
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap kein-druck">
                      <Knopf variante="still" onClick={() => oeffnen(b.typ)}>
                        Bearbeiten
                      </Knopf>
                      <Knopf variante="still" onClick={() => loeschen(b.typ)}>
                        Löschen
                      </Knopf>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-5 py-2.5" colSpan={4}>
                    Summe
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{euro(summeEk)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{euro(summeVk)}</td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${
                      summeVk - summeEk < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {euro(summeVk - summeEk)}
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
        titel={bearbeiteId ? 'Passtyp bearbeiten' : 'Neuer Passtyp'}
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
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Aktuelle Tarife:{' '}
          <ExternerLink href={SKIPASS_QUELLE.url}>{SKIPASS_QUELLE.name}</ExternerLink>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Feld label="Bezeichnung">
              <Eingabe
                value={entwurf.bezeichnung}
                placeholder="z. B. Silvapark Galtür – 6 Tage, Erwachsene"
                onChange={(e) =>
                  setEntwurf((alt) => ({ ...alt, bezeichnung: e.target.value }))
                }
              />
            </Feld>
          </div>
          <Feld label="Gültigkeit (Tage)">
            <Eingabe
              type="number"
              min={1}
              value={entwurf.tage}
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, tage: Number(e.target.value) || 1 }))
              }
            />
          </Feld>
          <div />
          <Feld label="Einkaufspreis (€)" hinweis="Was der Verein an die Bergbahn zahlt.">
            <Eingabe
              type="number"
              step="0.01"
              value={entwurf.ekPreis}
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, ekPreis: Number(e.target.value) || 0 }))
              }
            />
          </Feld>
          <Feld label="Verkaufspreis (€)" hinweis="Was der Teilnehmer zahlt.">
            <Eingabe
              type="number"
              step="0.01"
              value={entwurf.vkPreis}
              onChange={(e) =>
                setEntwurf((alt) => ({ ...alt, vkPreis: Number(e.target.value) || 0 }))
              }
            />
          </Feld>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium tracking-wide text-slate-600 uppercase">
            Gültig für Altersgruppen
          </legend>
          <p className="mt-1 text-xs text-slate-500">
            Keine Auswahl = für alle Gruppen wählbar.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {ALTERSGRUPPEN.map((gruppe) => (
              <label key={gruppe} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={entwurf.altersgruppen.includes(gruppe)}
                  onChange={() => gruppeUmschalten(gruppe)}
                />
                {ALTERSGRUPPE_LABEL[gruppe]}
              </label>
            ))}
          </div>
        </fieldset>

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
