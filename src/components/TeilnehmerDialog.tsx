import { useEffect, useState } from 'react'
import { berechneTeilnehmerpreis } from '../domain/kalkulation'
import {
  ALTERSGRUPPEN,
  ALTERSGRUPPE_LABEL,
  STATUS_LABEL,
  VERPFLEGUNG_VORSCHLAEGE,
  type Teilnehmer,
  type TeilnehmerStatus,
} from '../domain/types'
import { euro, heute } from '../lib/format'
import { useAusfahrt, useDaten } from '../store/useAusfahrt'
import { Dialog } from './Dialog'
import { Auswahl, Eingabe, Feld, Knopf, Textfeld } from './ui'

type TeilnehmerEntwurf = Omit<Teilnehmer, 'id' | 'angemeldetAm'>

function leererTeilnehmer(): TeilnehmerEntwurf {
  return {
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    geburtsdatum: '',
    altersgruppe: 'erwachsener',
    mitglied: true,
    beitragsfrei: false,
    status: 'angemeldet',
    verpflegung: '',
    zimmerId: undefined,
    skipassTypId: undefined,
    zusatzposten: [],
    rabatt: 0,
    rabattGrund: '',
    zahlungen: [],
    notiz: '',
  }
}

export function TeilnehmerDialog({
  offen,
  teilnehmerId,
  onSchliessen,
}: {
  offen: boolean
  teilnehmerId?: string
  onSchliessen: () => void
}) {
  const daten = useDaten()
  const {
    teilnehmerAnlegen,
    teilnehmerAendern,
    zusatzpostenHinzufuegen,
    zusatzpostenEntfernen,
    zahlungHinzufuegen,
    zahlungEntfernen,
  } = useAusfahrt()

  const bestehend = daten.teilnehmer.find((t) => t.id === teilnehmerId)
  const [entwurf, setEntwurf] = useState<TeilnehmerEntwurf>(leererTeilnehmer())
  const [neuerPosten, setNeuerPosten] = useState({ bezeichnung: '', betrag: '' })
  const [neueZahlung, setNeueZahlung] = useState({ datum: heute(), betrag: '', notiz: '' })
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    if (!offen) return
    setFehler('')
    setNeuerPosten({ bezeichnung: '', betrag: '' })
    setNeueZahlung({ datum: heute(), betrag: '', notiz: '' })
    if (bestehend) {
      const { id: _id, angemeldetAm: _angemeldet, ...rest } = bestehend
      setEntwurf(rest)
    } else {
      setEntwurf(leererTeilnehmer())
    }
    // Nur beim Öffnen bzw. Wechsel des Teilnehmers neu befüllen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen, teilnehmerId])

  const aendere = <K extends keyof TeilnehmerEntwurf>(
    feld: K,
    wert: TeilnehmerEntwurf[K],
  ) => setEntwurf((alt) => ({ ...alt, [feld]: wert }))

  const vorschau = berechneTeilnehmerpreis(
    {
      ...entwurf,
      id: bestehend?.id ?? 'vorschau',
      angemeldetAm: bestehend?.angemeldetAm ?? heute(),
    },
    daten,
  )

  const speichern = () => {
    if (!entwurf.vorname.trim() && !entwurf.nachname.trim()) {
      setFehler('Bitte mindestens einen Namen eintragen.')
      return
    }
    if (bestehend) {
      teilnehmerAendern(bestehend.id, entwurf)
    } else {
      teilnehmerAnlegen(entwurf)
    }
    onSchliessen()
  }

  const passtZurAltersgruppe = daten.skipassTypen.filter(
    (typ) =>
      typ.altersgruppen.length === 0 || typ.altersgruppen.includes(entwurf.altersgruppe),
  )

  return (
    <Dialog
      offen={offen}
      breit
      titel={bestehend ? 'Anmeldung bearbeiten' : 'Neue Anmeldung'}
      onSchliessen={onSchliessen}
      fuss={
        <>
          <Knopf onClick={onSchliessen}>Abbrechen</Knopf>
          <Knopf variante="primaer" onClick={speichern}>
            Speichern
          </Knopf>
        </>
      }
    >
      <div className="space-y-6">
        {fehler ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fehler}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Vorname">
            <Eingabe
              value={entwurf.vorname}
              onChange={(e) => aendere('vorname', e.target.value)}
              autoFocus
            />
          </Feld>
          <Feld label="Nachname">
            <Eingabe
              value={entwurf.nachname}
              onChange={(e) => aendere('nachname', e.target.value)}
            />
          </Feld>
          <Feld label="E-Mail">
            <Eingabe
              type="email"
              value={entwurf.email ?? ''}
              onChange={(e) => aendere('email', e.target.value)}
            />
          </Feld>
          <Feld label="Telefon">
            <Eingabe
              value={entwurf.telefon ?? ''}
              onChange={(e) => aendere('telefon', e.target.value)}
            />
          </Feld>
          <Feld label="Geburtsdatum">
            <Eingabe
              type="date"
              value={entwurf.geburtsdatum ?? ''}
              onChange={(e) => aendere('geburtsdatum', e.target.value)}
            />
          </Feld>
          <Feld label="Altersgruppe">
            <Auswahl
              value={entwurf.altersgruppe}
              onChange={(e) =>
                aendere('altersgruppe', e.target.value as typeof entwurf.altersgruppe)
              }
            >
              {ALTERSGRUPPEN.map((gruppe) => (
                <option key={gruppe} value={gruppe}>
                  {ALTERSGRUPPE_LABEL[gruppe]}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Mitgliedschaft">
            <Auswahl
              value={entwurf.mitglied ? 'mitglied' : 'gast'}
              onChange={(e) => aendere('mitglied', e.target.value === 'mitglied')}
            >
              <option value="mitglied">Vereinsmitglied</option>
              <option value="gast">Nichtmitglied / Gast</option>
            </Auswahl>
          </Feld>
          <Feld label="Status">
            <Auswahl
              value={entwurf.status}
              onChange={(e) => aendere('status', e.target.value as TeilnehmerStatus)}
            >
              {Object.entries(STATUS_LABEL).map(([wert, label]) => (
                <option key={wert} value={wert}>
                  {label}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Zimmer">
            <Auswahl
              value={entwurf.zimmerId ?? ''}
              onChange={(e) => aendere('zimmerId', e.target.value || undefined)}
            >
              <option value="">– noch nicht zugeordnet –</option>
              {daten.zimmer.map((zimmer) => (
                <option key={zimmer.id} value={zimmer.id}>
                  {zimmer.bezeichnung} ({zimmer.betten} Betten)
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Skipass">
            <Auswahl
              value={entwurf.skipassTypId ?? ''}
              onChange={(e) => aendere('skipassTypId', e.target.value || undefined)}
            >
              <option value="">– kein Skipass –</option>
              {passtZurAltersgruppe.map((typ) => (
                <option key={typ.id} value={typ.id}>
                  {typ.bezeichnung} · {euro(typ.vkPreis)}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld
            label="Verpflegung"
            hinweis="Wunsch oder Unverträglichkeit für die Unterkunft."
          >
            <Eingabe
              list="verpflegung-vorschlaege"
              value={entwurf.verpflegung ?? ''}
              placeholder="z. B. Vegetarisch"
              onChange={(e) => aendere('verpflegung', e.target.value)}
            />
            <datalist id="verpflegung-vorschlaege">
              {VERPFLEGUNG_VORSCHLAEGE.map((wunsch) => (
                <option key={wunsch} value={wunsch} />
              ))}
            </datalist>
          </Feld>
          <Feld label="Rabatt (€)">
            <Eingabe
              type="number"
              step="0.01"
              value={entwurf.rabatt}
              onChange={(e) => aendere('rabatt', Number(e.target.value) || 0)}
            />
          </Feld>
          <Feld label="Rabattgrund">
            <Eingabe
              value={entwurf.rabattGrund ?? ''}
              onChange={(e) => aendere('rabattGrund', e.target.value)}
              placeholder="z. B. Helfer, Geschwisterrabatt"
            />
          </Feld>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300"
            checked={entwurf.beitragsfrei}
            onChange={(e) => aendere('beitragsfrei', e.target.checked)}
          />
          <span>
            <span className="font-medium text-slate-900">
              Kostenlose Teilnahme (Busfahrer, Helfer)
            </span>
            <span className="mt-0.5 block text-slate-600">
              Zahlt keinen Beitrag, belegt aber ein Bett und zählt bei der
              Kostenhochrechnung mit.
            </span>
          </span>
        </label>

        <Feld label="Notiz">
          <Textfeld
            rows={2}
            value={entwurf.notiz ?? ''}
            onChange={(e) => aendere('notiz', e.target.value)}
            placeholder="Allergien, Wunschzimmerpartner, Leihmaterial …"
          />
        </Feld>

        {bestehend ? (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Zusatzposten
              </h3>
              {bestehend.zusatzposten.length === 0 ? (
                <p className="text-sm text-slate-500">Keine Zusatzposten erfasst.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {bestehend.zusatzposten.map((posten) => (
                    <li
                      key={posten.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span>{posten.bezeichnung}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{euro(posten.betrag)}</span>
                        <Knopf
                          variante="still"
                          onClick={() => zusatzpostenEntfernen(bestehend.id, posten.id)}
                        >
                          Entfernen
                        </Knopf>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Eingabe
                  className="flex-1 min-w-40"
                  placeholder="Bezeichnung, z. B. Leihski"
                  value={neuerPosten.bezeichnung}
                  onChange={(e) =>
                    setNeuerPosten((alt) => ({ ...alt, bezeichnung: e.target.value }))
                  }
                />
                <Eingabe
                  className="w-28"
                  type="number"
                  step="0.01"
                  placeholder="Betrag"
                  value={neuerPosten.betrag}
                  onChange={(e) =>
                    setNeuerPosten((alt) => ({ ...alt, betrag: e.target.value }))
                  }
                />
                <Knopf
                  disabled={!neuerPosten.bezeichnung.trim()}
                  onClick={() => {
                    zusatzpostenHinzufuegen(bestehend.id, {
                      bezeichnung: neuerPosten.bezeichnung.trim(),
                      betrag: Number(neuerPosten.betrag) || 0,
                    })
                    setNeuerPosten({ bezeichnung: '', betrag: '' })
                  }}
                >
                  Hinzufügen
                </Knopf>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Zahlungen
              </h3>
              {bestehend.zahlungen.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Zahlung eingegangen.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {bestehend.zahlungen.map((zahlung) => (
                    <li
                      key={zahlung.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span>
                        {zahlung.datum}
                        {zahlung.notiz ? (
                          <span className="text-slate-500"> · {zahlung.notiz}</span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{euro(zahlung.betrag)}</span>
                        <Knopf
                          variante="still"
                          onClick={() => zahlungEntfernen(bestehend.id, zahlung.id)}
                        >
                          Entfernen
                        </Knopf>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Eingabe
                  className="w-40"
                  type="date"
                  value={neueZahlung.datum}
                  onChange={(e) =>
                    setNeueZahlung((alt) => ({ ...alt, datum: e.target.value }))
                  }
                />
                <Eingabe
                  className="w-28"
                  type="number"
                  step="0.01"
                  placeholder="Betrag"
                  value={neueZahlung.betrag}
                  onChange={(e) =>
                    setNeueZahlung((alt) => ({ ...alt, betrag: e.target.value }))
                  }
                />
                <Eingabe
                  className="flex-1 min-w-32"
                  placeholder="Notiz (optional)"
                  value={neueZahlung.notiz}
                  onChange={(e) =>
                    setNeueZahlung((alt) => ({ ...alt, notiz: e.target.value }))
                  }
                />
                <Knopf
                  disabled={!neueZahlung.betrag}
                  onClick={() => {
                    zahlungHinzufuegen(bestehend.id, {
                      datum: neueZahlung.datum,
                      betrag: Number(neueZahlung.betrag) || 0,
                      notiz: neueZahlung.notiz.trim() || undefined,
                    })
                    setNeueZahlung({ datum: heute(), betrag: '', notiz: '' })
                  }}
                >
                  Buchen
                </Knopf>
              </div>
            </section>
          </>
        ) : (
          <p className="rounded-lg bg-alpen-50 px-3 py-2 text-sm text-alpen-700">
            Zusatzposten und Zahlungen lassen sich erfassen, sobald die Anmeldung
            gespeichert ist.
          </p>
        )}

        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            Preisvorschau
          </h3>
          <dl className="mt-2 space-y-1 text-sm">
            <Zeile label="Grundpreis" wert={vorschau.grundpreis} />
            <Zeile label="Zimmerzuschlag" wert={vorschau.zimmerzuschlag} />
            <Zeile label="Skipass" wert={vorschau.skipass} />
            <Zeile label="Zusatzposten" wert={vorschau.zusatzposten} />
            <Zeile label="Rabatt" wert={-vorschau.rabatt} />
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
              <dt>Gesamt</dt>
              <dd className="tabular-nums">{euro(vorschau.gesamt)}</dd>
            </div>
            {bestehend ? (
              <div className="flex justify-between text-slate-600">
                <dt>Offen</dt>
                <dd className="tabular-nums">{euro(vorschau.offen)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </Dialog>
  )
}

function Zeile({ label, wert }: { label: string; wert: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd className="tabular-nums">{euro(wert)}</dd>
    </div>
  )
}
