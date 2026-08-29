import { useRef, useState } from 'react'
import { Eingabe, Feld, Karte, Knopf, Seitenkopf, Textfeld } from '../components/ui'
import { naechte } from '../domain/kalkulation'
import { dateiHerunterladen } from '../lib/csv'
import { useAusfahrt, useDaten, pruefeImport } from '../store/useAusfahrt'

export function Einstellungen() {
  const daten = useDaten()
  const { setzeAusfahrt, datenErsetzen, zuruecksetzen } = useAusfahrt()
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState<{ art: 'gut' | 'fehler'; text: string } | null>(
    null,
  )

  const anzahlNaechte = naechte(daten.ausfahrt.anreise, daten.ausfahrt.abreise)

  const exportieren = () => {
    dateiHerunterladen(
      JSON.stringify(daten, null, 2),
      `galtuer-${daten.ausfahrt.jahr}-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    )
    setMeldung({ art: 'gut', text: 'Sicherung heruntergeladen.' })
  }

  const importieren = async (datei: File) => {
    try {
      const geprueft = pruefeImport(JSON.parse(await datei.text()))
      const sicher = window.confirm(
        'Import ersetzt alle aktuell gespeicherten Daten. Fortfahren?',
      )
      if (!sicher) return
      datenErsetzen(geprueft)
      setMeldung({
        art: 'gut',
        text: `Import erfolgreich: ${geprueft.teilnehmer.length} Anmeldungen übernommen.`,
      })
    } catch (fehler) {
      setMeldung({
        art: 'fehler',
        text: `Import fehlgeschlagen: ${fehler instanceof Error ? fehler.message : 'unbekannter Fehler'}`,
      })
    } finally {
      if (dateiFeld.current) dateiFeld.current.value = ''
    }
  }

  return (
    <>
      <Seitenkopf
        titel="Einstellungen"
        beschreibung="Eckdaten der Ausfahrt sowie Sicherung und Übergabe der Daten."
      />

      {meldung ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            meldung.art === 'gut'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {meldung.text}
        </div>
      ) : null}

      <Karte titel="Eckdaten der Ausfahrt">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Feld label="Titel">
              <Eingabe
                value={daten.ausfahrt.titel}
                onChange={(e) => setzeAusfahrt({ titel: e.target.value })}
              />
            </Feld>
          </div>
          <Feld label="Saison / Jahr">
            <Eingabe
              type="number"
              value={daten.ausfahrt.jahr}
              onChange={(e) =>
                setzeAusfahrt({ jahr: Number(e.target.value) || new Date().getFullYear() })
              }
            />
          </Feld>
          <Feld label="Ort">
            <Eingabe
              value={daten.ausfahrt.ort}
              onChange={(e) => setzeAusfahrt({ ort: e.target.value })}
            />
          </Feld>
          <div className="sm:col-span-2">
            <Feld label="Unterkunft">
              <Eingabe
                value={daten.ausfahrt.unterkunft}
                placeholder="Name und Adresse der Unterkunft"
                onChange={(e) => setzeAusfahrt({ unterkunft: e.target.value })}
              />
            </Feld>
          </div>
          <Feld label="Anreise">
            <Eingabe
              type="date"
              value={daten.ausfahrt.anreise}
              onChange={(e) => setzeAusfahrt({ anreise: e.target.value })}
            />
          </Feld>
          <Feld label="Abreise" hinweis={`${anzahlNaechte} Nächte`}>
            <Eingabe
              type="date"
              value={daten.ausfahrt.abreise}
              onChange={(e) => setzeAusfahrt({ abreise: e.target.value })}
            />
          </Feld>
          <Feld label="Anmeldeschluss">
            <Eingabe
              type="date"
              value={daten.ausfahrt.anmeldeschluss ?? ''}
              onChange={(e) => setzeAusfahrt({ anmeldeschluss: e.target.value })}
            />
          </Feld>
          <Feld label="Ansprechpartner">
            <Eingabe
              value={daten.ausfahrt.ansprechpartner ?? ''}
              onChange={(e) => setzeAusfahrt({ ansprechpartner: e.target.value })}
            />
          </Feld>
          <div className="sm:col-span-2">
            <Feld label="Kontakt-E-Mail">
              <Eingabe
                type="email"
                value={daten.ausfahrt.kontaktEmail ?? ''}
                onChange={(e) => setzeAusfahrt({ kontaktEmail: e.target.value })}
              />
            </Feld>
          </div>
          <div className="sm:col-span-2">
            <Feld label="Hinweis für Teilnehmende">
              <Textfeld
                rows={3}
                value={daten.ausfahrt.hinweis ?? ''}
                onChange={(e) => setzeAusfahrt({ hinweis: e.target.value })}
              />
            </Feld>
          </div>
        </div>
      </Karte>

      <Karte titel="Sicherung und Übergabe">
        <p className="text-sm text-slate-600">
          Die App speichert alle Daten ausschließlich lokal im Browser dieses Geräts – es
          gibt keinen Server. Für Backups, den Wechsel des Geräts oder die Übergabe an die
          nächste Ausfahrtsleitung die Daten als JSON exportieren und dort wieder
          importieren.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Knopf variante="primaer" onClick={exportieren}>
            Alles als JSON sichern
          </Knopf>
          <Knopf onClick={() => dateiFeld.current?.click()}>JSON importieren</Knopf>
          <input
            ref={dateiFeld}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const datei = e.target.files?.[0]
              if (datei) void importieren(datei)
            }}
          />
        </div>
      </Karte>

      <Karte titel="Neue Saison">
        <p className="text-sm text-slate-600">
          Setzt alle Daten auf den Auslieferungszustand zurück. Vorher unbedingt eine
          Sicherung herunterladen – der Schritt lässt sich nicht rückgängig machen.
        </p>
        <div className="mt-4">
          <Knopf
            variante="gefahr"
            onClick={() => {
              if (
                window.confirm(
                  'Wirklich alle Anmeldungen, Zimmer, Skipässe und Ausgaben löschen?',
                )
              ) {
                zuruecksetzen()
                setMeldung({ art: 'gut', text: 'Daten zurückgesetzt.' })
              }
            }}
          >
            Alle Daten zurücksetzen
          </Knopf>
        </div>
      </Karte>
    </>
  )
}
