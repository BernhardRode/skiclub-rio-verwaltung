import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DATEN_VERSION, erstelleStartdaten } from '../domain/defaults'
import type {
  Ausfahrt,
  AusfahrtDaten,
  Ausgabe,
  Preise,
  SkipassTyp,
  Teilnehmer,
  Zahlung,
  Zimmer,
  Zusatzposten,
} from '../domain/types'
import type { ImportTeilnehmer } from '../lib/listenImport'
import { neueId } from '../lib/id'

export const SPEICHER_SCHLUESSEL = 'skiclub-rio-galtuer'

type NeuerTeilnehmer = Omit<Teilnehmer, 'id' | 'angemeldetAm'> &
  Partial<Pick<Teilnehmer, 'angemeldetAm'>>

interface AusfahrtStore {
  daten: AusfahrtDaten

  setzeAusfahrt: (aenderung: Partial<Ausfahrt>) => void
  setzePreise: (aenderung: Partial<Preise>) => void

  teilnehmerAnlegen: (teilnehmer: NeuerTeilnehmer) => string
  teilnehmerlisteUebernehmen: (
    eintraege: ImportTeilnehmer[],
    optionen: { zimmerAnlegen: boolean; ersetzen: boolean },
  ) => void
  teilnehmerAendern: (id: string, aenderung: Partial<Teilnehmer>) => void
  teilnehmerLoeschen: (id: string) => void
  zimmerZuordnen: (teilnehmerId: string, zimmerId?: string) => void
  zusatzpostenHinzufuegen: (
    teilnehmerId: string,
    posten: Omit<Zusatzposten, 'id'>,
  ) => void
  zusatzpostenEntfernen: (teilnehmerId: string, postenId: string) => void
  zahlungHinzufuegen: (
    teilnehmerId: string,
    zahlung: Omit<Zahlung, 'id'>,
  ) => void
  zahlungEntfernen: (teilnehmerId: string, zahlungId: string) => void

  zimmerAnlegen: (zimmer: Omit<Zimmer, 'id'>) => string
  zimmerAendern: (id: string, aenderung: Partial<Zimmer>) => void
  zimmerLoeschen: (id: string) => void

  skipassAnlegen: (typ: Omit<SkipassTyp, 'id'>) => string
  skipassAendern: (id: string, aenderung: Partial<SkipassTyp>) => void
  skipassLoeschen: (id: string) => void

  ausgabeAnlegen: (ausgabe: Omit<Ausgabe, 'id'>) => string
  ausgabeAendern: (id: string, aenderung: Partial<Ausgabe>) => void
  ausgabeLoeschen: (id: string) => void

  datenErsetzen: (daten: AusfahrtDaten) => void
  zuruecksetzen: () => void
}

/** Füllt Felder auf, die in älteren Ständen oder Importen fehlen können. */
function normalisiereTeilnehmer(liste: Teilnehmer[]): Teilnehmer[] {
  return liste.map((teilnehmer) => ({
    ...teilnehmer,
    beitragsfrei: teilnehmer.beitragsfrei ?? false,
    rabatt: teilnehmer.rabatt ?? 0,
    zusatzposten: teilnehmer.zusatzposten ?? [],
    zahlungen: teilnehmer.zahlungen ?? [],
  }))
}

function aktualisiere<T extends { id: string }>(
  liste: T[],
  id: string,
  aenderung: Partial<T>,
): T[] {
  return liste.map((eintrag) =>
    eintrag.id === id ? { ...eintrag, ...aenderung, id: eintrag.id } : eintrag,
  )
}

export const useAusfahrt = create<AusfahrtStore>()(
  persist(
    (set) => ({
      daten: erstelleStartdaten(),

      setzeAusfahrt: (aenderung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            ausfahrt: { ...state.daten.ausfahrt, ...aenderung },
          },
        })),

      setzePreise: (aenderung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            preise: { ...state.daten.preise, ...aenderung },
          },
        })),

      teilnehmerAnlegen: (teilnehmer) => {
        const id = neueId()
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: [
              ...state.daten.teilnehmer,
              {
                ...teilnehmer,
                id,
                angemeldetAm:
                  teilnehmer.angemeldetAm ?? new Date().toISOString().slice(0, 10),
              },
            ],
          },
        }))
        return id
      },

      teilnehmerlisteUebernehmen: (eintraege, optionen) =>
        set((state) => {
          const zimmer = [...state.daten.zimmer]
          const nachBezeichnung = new Map(
            zimmer.map((z) => [z.bezeichnung.toLowerCase(), z]),
          )

          if (optionen.zimmerAnlegen) {
            // Bettenzahl aus der Belegung der Liste ableiten – nachträglich
            // in der Zimmerverwaltung korrigierbar.
            const belegung = new Map<string, number>()
            for (const eintrag of eintraege) {
              const bezeichnung = eintrag.zimmerBezeichnung?.trim()
              if (!bezeichnung) continue
              belegung.set(bezeichnung, (belegung.get(bezeichnung) ?? 0) + 1)
            }
            for (const [bezeichnung, betten] of belegung) {
              if (nachBezeichnung.has(bezeichnung.toLowerCase())) continue
              const neu = {
                id: neueId(),
                bezeichnung,
                kategorie: betten === 1 ? 'Einzelzimmer' : `${betten}-Bett-Zimmer`,
                betten,
                zuschlagProPerson: 0,
              }
              zimmer.push(neu)
              nachBezeichnung.set(bezeichnung.toLowerCase(), neu)
            }
          }

          const heute = new Date().toISOString().slice(0, 10)
          const uebernommen = eintraege.map(({ zimmerBezeichnung, ...rest }) => ({
            ...rest,
            id: neueId(),
            angemeldetAm: heute,
            zimmerId: zimmerBezeichnung
              ? nachBezeichnung.get(zimmerBezeichnung.trim().toLowerCase())?.id
              : undefined,
          }))

          return {
            daten: {
              ...state.daten,
              zimmer,
              teilnehmer: optionen.ersetzen
                ? uebernommen
                : [...state.daten.teilnehmer, ...uebernommen],
            },
          }
        }),

      teilnehmerAendern: (id, aenderung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: aktualisiere(state.daten.teilnehmer, id, aenderung),
          },
        })),

      teilnehmerLoeschen: (id) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: state.daten.teilnehmer.filter((t) => t.id !== id),
          },
        })),

      zimmerZuordnen: (teilnehmerId, zimmerId) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.id === teilnehmerId ? { ...t, zimmerId } : t,
            ),
          },
        })),

      zusatzpostenHinzufuegen: (teilnehmerId, posten) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.id === teilnehmerId
                ? {
                    ...t,
                    zusatzposten: [...t.zusatzposten, { ...posten, id: neueId() }],
                  }
                : t,
            ),
          },
        })),

      zusatzpostenEntfernen: (teilnehmerId, postenId) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.id === teilnehmerId
                ? {
                    ...t,
                    zusatzposten: t.zusatzposten.filter((p) => p.id !== postenId),
                  }
                : t,
            ),
          },
        })),

      zahlungHinzufuegen: (teilnehmerId, zahlung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.id === teilnehmerId
                ? { ...t, zahlungen: [...t.zahlungen, { ...zahlung, id: neueId() }] }
                : t,
            ),
          },
        })),

      zahlungEntfernen: (teilnehmerId, zahlungId) =>
        set((state) => ({
          daten: {
            ...state.daten,
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.id === teilnehmerId
                ? { ...t, zahlungen: t.zahlungen.filter((z) => z.id !== zahlungId) }
                : t,
            ),
          },
        })),

      zimmerAnlegen: (zimmer) => {
        const id = neueId()
        set((state) => ({
          daten: { ...state.daten, zimmer: [...state.daten.zimmer, { ...zimmer, id }] },
        }))
        return id
      },

      zimmerAendern: (id, aenderung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            zimmer: aktualisiere(state.daten.zimmer, id, aenderung),
          },
        })),

      zimmerLoeschen: (id) =>
        set((state) => ({
          daten: {
            ...state.daten,
            zimmer: state.daten.zimmer.filter((z) => z.id !== id),
            // Belegungen des gelöschten Zimmers wieder freigeben.
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.zimmerId === id ? { ...t, zimmerId: undefined } : t,
            ),
          },
        })),

      skipassAnlegen: (typ) => {
        const id = neueId()
        set((state) => ({
          daten: {
            ...state.daten,
            skipassTypen: [...state.daten.skipassTypen, { ...typ, id }],
          },
        }))
        return id
      },

      skipassAendern: (id, aenderung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            skipassTypen: aktualisiere(state.daten.skipassTypen, id, aenderung),
          },
        })),

      skipassLoeschen: (id) =>
        set((state) => ({
          daten: {
            ...state.daten,
            skipassTypen: state.daten.skipassTypen.filter((s) => s.id !== id),
            teilnehmer: state.daten.teilnehmer.map((t) =>
              t.skipassTypId === id ? { ...t, skipassTypId: undefined } : t,
            ),
          },
        })),

      ausgabeAnlegen: (ausgabe) => {
        const id = neueId()
        set((state) => ({
          daten: { ...state.daten, ausgaben: [...state.daten.ausgaben, { ...ausgabe, id }] },
        }))
        return id
      },

      ausgabeAendern: (id, aenderung) =>
        set((state) => ({
          daten: {
            ...state.daten,
            ausgaben: aktualisiere(state.daten.ausgaben, id, aenderung),
          },
        })),

      ausgabeLoeschen: (id) =>
        set((state) => ({
          daten: {
            ...state.daten,
            ausgaben: state.daten.ausgaben.filter((a) => a.id !== id),
          },
        })),

      datenErsetzen: (daten) => set({ daten }),

      zuruecksetzen: () => set({ daten: erstelleStartdaten() }),
    }),
    {
      name: SPEICHER_SCHLUESSEL,
      version: DATEN_VERSION,
      partialize: (state) => ({ daten: state.daten }),
      // Nachträglich ergänzte Felder auffüllen, damit ältere Stände laden.
      merge: (persistiert, aktuell) => {
        const gespeichert = (persistiert as { daten?: Partial<AusfahrtDaten> } | undefined)
          ?.daten
        if (!gespeichert) return aktuell
        const zusammengefuehrt = { ...erstelleStartdaten(), ...gespeichert }
        return {
          ...aktuell,
          daten: {
            ...zusammengefuehrt,
            teilnehmer: normalisiereTeilnehmer(zusammengefuehrt.teilnehmer),
          },
        }
      },
    },
  ),
)

/** Bequemer Zugriff auf die Daten ohne Store-Aktionen. */
export const useDaten = () => useAusfahrt((state) => state.daten)

export function ladeDaten(): AusfahrtDaten {
  return useAusfahrt.getState().daten
}

export function pruefeImport(roh: unknown): AusfahrtDaten {
  if (typeof roh !== 'object' || roh === null) {
    throw new Error('Die Datei enthält kein gültiges JSON-Objekt.')
  }
  const kandidat = roh as Partial<AusfahrtDaten>
  const pflichtlisten: (keyof AusfahrtDaten)[] = [
    'teilnehmer',
    'zimmer',
    'skipassTypen',
    'ausgaben',
  ]
  for (const feld of pflichtlisten) {
    if (!Array.isArray(kandidat[feld])) {
      throw new Error(`Das Feld "${feld}" fehlt oder ist keine Liste.`)
    }
  }
  if (!kandidat.ausfahrt || !kandidat.preise) {
    throw new Error('Die Felder "ausfahrt" und "preise" werden benötigt.')
  }
  const start = erstelleStartdaten()
  return {
    ...start,
    ...kandidat,
    teilnehmer: normalisiereTeilnehmer(kandidat.teilnehmer as Teilnehmer[]),
    version: DATEN_VERSION,
    ausfahrt: { ...start.ausfahrt, ...kandidat.ausfahrt },
    preise: {
      ...start.preise,
      ...kandidat.preise,
      grundpreise: { ...start.preise.grundpreise, ...kandidat.preise.grundpreise },
    },
  } as AusfahrtDaten
}
