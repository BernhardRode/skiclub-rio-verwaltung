import { Eingabe, Karte, Seitenkopf } from '../components/ui'
import { berechneTeilnehmerpreis, istZahlend } from '../domain/kalkulation'
import {
  ALTERSGRUPPEN,
  ALTERSGRUPPE_LABEL,
  type Altersgruppe,
} from '../domain/types'
import { euro } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'

export function Preise() {
  const daten = useDaten()
  const { setzePreise } = useAusfahrt()

  const setzeGrundpreis = (
    gruppe: Altersgruppe,
    art: 'mitglied' | 'gast',
    wert: number,
  ) =>
    setzePreise({
      grundpreise: {
        ...daten.preise.grundpreise,
        [gruppe]: { ...daten.preise.grundpreise[gruppe], [art]: wert },
      },
    })

  const zahlende = daten.teilnehmer.filter(istZahlend)

  const statistik = ALTERSGRUPPEN.map((gruppe) => {
    const personen = zahlende.filter((t) => t.altersgruppe === gruppe)
    const mitglieder = personen.filter((t) => t.mitglied).length
    const einnahmen = personen.reduce(
      (summe, t) => summe + berechneTeilnehmerpreis(t, daten).gesamt,
      0,
    )
    return {
      gruppe,
      anzahl: personen.length,
      mitglieder,
      gaeste: personen.length - mitglieder,
      einnahmen,
    }
  })

  return (
    <>
      <Seitenkopf
        titel="Preise"
        beschreibung="Grundpreis je Altersgruppe für Mitglieder und Gäste. Skipass, Zimmerzuschlag und individuelle Posten kommen pro Person dazu."
      />

      <Karte titel="Grundpreise (Unterkunft, Verpflegung, Fahrt)">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                <th className="px-5 py-2 font-medium">Altersgruppe</th>
                <th className="px-3 py-2 font-medium">Mitglied (€)</th>
                <th className="px-3 py-2 font-medium">Nichtmitglied (€)</th>
                <th className="px-5 py-2 text-right font-medium">Gastaufschlag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ALTERSGRUPPEN.map((gruppe) => {
                const preis = daten.preise.grundpreise[gruppe]
                return (
                  <tr key={gruppe}>
                    <td className="px-5 py-2.5 font-medium text-slate-900">
                      {ALTERSGRUPPE_LABEL[gruppe]}
                    </td>
                    <td className="px-3 py-2">
                      <Eingabe
                        type="number"
                        step="0.01"
                        className="w-32"
                        aria-label={`Mitgliedspreis ${ALTERSGRUPPE_LABEL[gruppe]}`}
                        value={preis.mitglied}
                        onChange={(e) =>
                          setzeGrundpreis(gruppe, 'mitglied', Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Eingabe
                        type="number"
                        step="0.01"
                        className="w-32"
                        aria-label={`Gastpreis ${ALTERSGRUPPE_LABEL[gruppe]}`}
                        value={preis.gast}
                        onChange={(e) =>
                          setzeGrundpreis(gruppe, 'gast', Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">
                      {euro(preis.gast - preis.mitglied)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte titel="Skipass-Verbuchung">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300"
            checked={daten.preise.skipassEinkaufAutomatisch}
            onChange={(e) => setzePreise({ skipassEinkaufAutomatisch: e.target.checked })}
          />
          <span>
            <span className="font-medium text-slate-900">
              Skipass-Einkauf automatisch als Ausgabe verbuchen
            </span>
            <span className="mt-0.5 block text-slate-600">
              Die Summe der Einkaufspreise aller zugeordneten Pässe erscheint in der
              Kalkulation als eigener Posten. Deaktivieren, wenn die Skipass-Kosten bereits
              als manuelle Ausgabe erfasst sind.
            </span>
          </span>
        </label>
      </Karte>

      <Karte titel="Verteilung der Anmeldungen">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                <th className="px-5 py-2 font-medium">Altersgruppe</th>
                <th className="px-3 py-2 text-right font-medium">Personen</th>
                <th className="px-3 py-2 text-right font-medium">Mitglieder</th>
                <th className="px-3 py-2 text-right font-medium">Gäste</th>
                <th className="px-5 py-2 text-right font-medium">Einnahmen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statistik.map((zeile) => (
                <tr key={zeile.gruppe}>
                  <td className="px-5 py-2.5">{ALTERSGRUPPE_LABEL[zeile.gruppe]}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{zeile.anzahl}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {zeile.mitglieder}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{zeile.gaeste}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {euro(zeile.einnahmen)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-5 py-2.5">Gesamt</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {statistik.reduce((s, z) => s + z.anzahl, 0)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {statistik.reduce((s, z) => s + z.mitglieder, 0)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {statistik.reduce((s, z) => s + z.gaeste, 0)}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  {euro(statistik.reduce((s, z) => s + z.einnahmen, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Karte>
    </>
  )
}
