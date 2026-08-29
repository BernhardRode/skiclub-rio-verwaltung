import { berechneSkipassEmpfehlung, type PassOption } from '../domain/kalkulation'
import { ALTERSGRUPPE_LABEL } from '../domain/types'
import { euro, plural } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'
import { Etikett, Karte, Knopf, LeerZustand } from './ui'

/**
 * Emphasis-Darstellung: Die Empfehlung trägt den Akzentton, die Alternativen
 * den De-Emphasis-Grauton. Jeder Balken ist zusätzlich direkt beschriftet,
 * damit die Zuordnung nie allein über die Farbe läuft.
 */
const AKZENT = '#2a78d6'
const NEBENSACHE = '#898781'

export function SkipassEmpfehlung() {
  const daten = useDaten()
  const { teilnehmerAendern } = useAusfahrt()
  const e = berechneSkipassEmpfehlung(daten)

  const uebernehmen = () => {
    const zuweisung = new Map(
      e.gruppen
        .filter((g) => g.empfehlung)
        .map((g) => [g.altersgruppe, g.empfehlung!.id]),
    )
    const betroffen = daten.teilnehmer.filter(
      (t) =>
        t.status !== 'storniert' &&
        zuweisung.has(t.altersgruppe) &&
        t.skipassTypId !== zuweisung.get(t.altersgruppe),
    )
    if (betroffen.length === 0) return
    if (
      !window.confirm(
        `Bei ${plural(betroffen.length, 'Person wird', 'Personen werden')} der empfohlene Pass eingetragen. Fortfahren?`,
      )
    ) {
      return
    }
    for (const person of betroffen) {
      teilnehmerAendern(person.id, { skipassTypId: zuweisung.get(person.altersgruppe) })
    }
  }

  if (e.gruppen.length === 0) {
    return (
      <Karte titel="Welche Pässe bestellen?">
        <LeerZustand text="Sobald Anmeldungen erfasst sind, steht hier der Bestellvorschlag." />
      </Karte>
    )
  }

  const vergleichbar = e.gruppen.filter((g) => g.optionen.length > 0)
  // Die Balken zeigen den Preis pro Person. Gruppensummen liegen je nach
  // Kopfzahl um Größenordnungen auseinander – auf einer gemeinsamen Skala wäre
  // die kleinste Gruppe nicht mehr ablesbar.
  const maximum = Math.max(
    1,
    ...vergleichbar.flatMap((g) => g.optionen.map((o) => o.typ.ekPreis)),
  )

  return (
    <Karte
      titel="Welche Pässe bestellen?"
      aktion={
        e.bestellung.length > 0 ? (
          <Knopf variante="primaer" onClick={uebernehmen} className="kein-druck">
            Empfehlung übernehmen
          </Knopf>
        ) : undefined
      }
    >
      {e.bestellung.length === 0 ? (
        <LeerZustand text="Für den Vergleich fehlen noch Einkaufspreise. Trage sie bei den Passtypen ein – ohne Preis lässt sich nichts empfehlen." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Einkauf gesamt
              </div>
              <div className="text-3xl font-semibold tabular-nums text-slate-900">
                {euro(e.ekGesamt)}
              </div>
            </div>
            {e.ersparnis > 0 ? (
              <p className="pb-1.5 text-sm text-slate-600">
                <strong className="text-emerald-700">{euro(e.ersparnis)}</strong> günstiger
                als die jeweils teuerste passende Variante ({euro(e.teuersteEk)}).
              </p>
            ) : (
              <p className="pb-1.5 text-sm text-slate-600">
                Je Altersgruppe steht nur eine Variante mit Preis zur Wahl – für einen
                Vergleich einen zweiten Passtyp anlegen.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
              Bestellvorschlag
            </h3>
            <div className="mt-2 -mx-5 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th className="px-5 py-2 font-medium">Passtyp</th>
                    <th className="px-3 py-2 text-right font-medium">Anzahl</th>
                    <th className="px-3 py-2 text-right font-medium">Einkauf je</th>
                    <th className="px-5 py-2 text-right font-medium">Einkauf gesamt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {e.bestellung.map((posten) => (
                    <tr key={posten.typ.id}>
                      <td className="px-5 py-2.5 font-medium text-slate-900">
                        {posten.typ.bezeichnung}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {posten.anzahl}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                        {euro(posten.typ.ekPreis)}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {euro(posten.ekSumme)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-5 py-2.5">Summe</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {e.bestellung.reduce((s, p) => s + p.anzahl, 0)}
                    </td>
                    <td className="px-3 py-2.5" />
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {euro(e.ekGesamt)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {vergleichbar.some((g) => g.optionen.length > 1) ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Vergleich der Varianten
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Einkaufspreis pro Person, gemeinsame Skala über alle Altersgruppen.
                Farbig = Empfehlung.
              </p>
              <div className="mt-4 space-y-5">
                {vergleichbar.map((gruppe) => (
                  <div key={gruppe.altersgruppe}>
                    <div className="text-sm font-medium text-slate-700">
                      {ALTERSGRUPPE_LABEL[gruppe.altersgruppe]}
                      <span className="ml-2 font-normal text-slate-500">
                        {plural(gruppe.personen, 'Person', 'Personen')}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {gruppe.optionen.map((option) => (
                        <li key={option.typ.id}>
                          <Balken option={option} maximum={maximum} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {e.aktuellVollstaendig && e.aktuellEk !== e.ekGesamt ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Die aktuell eingetragene Zuordnung kostet {euro(e.aktuellEk)} –{' '}
              <strong>{euro(e.aktuellEk - e.ekGesamt)}</strong> mehr als der
              Bestellvorschlag.
            </p>
          ) : null}

          {e.personenOhneOption > 0 ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Für {plural(e.personenOhneOption, 'Person', 'Personen')} gibt es keinen
              Passtyp mit hinterlegtem Einkaufspreis – sie fehlen im Vorschlag.
            </p>
          ) : null}
        </div>
      )}
    </Karte>
  )
}

function Balken({ option, maximum }: { option: PassOption; maximum: number }) {
  const anteil = Math.max(0.02, option.typ.ekPreis / maximum)
  const mehrProPerson = option.anzahl > 0 ? option.mehrkosten / option.anzahl : 0
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
      title={`${option.typ.bezeichnung}: ${option.anzahl} × ${euro(option.typ.ekPreis)} = ${euro(option.ekSumme)}`}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
        <span className="truncate">{option.typ.bezeichnung}</span>
        {option.empfohlen ? (
          <Etikett ton="blau">Empfehlung</Etikett>
        ) : (
          <span className="whitespace-nowrap text-xs text-slate-500">
            +{euro(mehrProPerson)} pro Person
          </span>
        )}
      </div>
      <div className="text-right whitespace-nowrap">
        <span className="text-sm font-medium tabular-nums text-slate-900">
          {euro(option.typ.ekPreis)}
        </span>
        <span className="ml-2 text-xs tabular-nums text-slate-500">
          {option.anzahl} × = {euro(option.ekSumme)}
        </span>
      </div>
      <div className="col-span-2 mt-1.5 h-3">
        <div
          className="h-full rounded-r-[4px]"
          style={{
            width: `${anteil * 100}%`,
            backgroundColor: option.empfohlen ? AKZENT : NEBENSACHE,
          }}
        />
      </div>
    </div>
  )
}
