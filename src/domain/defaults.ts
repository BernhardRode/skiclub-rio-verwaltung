import { neueId } from '../lib/id'
import type { AusfahrtDaten } from './types'

export const DATEN_VERSION = 1

/**
 * Startdatensatz mit realistischen Platzhaltern. Alle Werte lassen sich in der
 * App ändern – sie dienen nur als Gerüst für die erste Planung.
 */
export function erstelleStartdaten(): AusfahrtDaten {
  const skipassErwachsen = neueId()
  const skipassJugend = neueId()
  const skipassKind = neueId()

  return {
    version: DATEN_VERSION,
    ausfahrt: {
      titel: 'Skiclub Rio – Ausfahrt Galtür',
      jahr: 2027,
      ort: 'Galtür, Paznauntal (AT)',
      unterkunft: '',
      anreise: '2027-01-16',
      abreise: '2027-01-23',
      anmeldeschluss: '2026-11-30',
      ansprechpartner: '',
      kontaktEmail: '',
      hinweis: '',
    },
    preise: {
      grundpreise: {
        erwachsener: { mitglied: 480, gast: 560 },
        jugendlicher: { mitglied: 360, gast: 420 },
        kind: { mitglied: 240, gast: 290 },
        kleinkind: { mitglied: 0, gast: 0 },
      },
      skipassEinkaufAutomatisch: true,
    },
    teilnehmer: [],
    zimmer: [],
    skipassTypen: [
      {
        id: skipassErwachsen,
        bezeichnung: 'Silvapark Galtür – 6 Tage, Erwachsene',
        tage: 6,
        ekPreis: 268,
        vkPreis: 268,
        altersgruppen: ['erwachsener'],
      },
      {
        id: skipassJugend,
        bezeichnung: 'Silvapark Galtür – 6 Tage, Jugendliche',
        tage: 6,
        ekPreis: 214,
        vkPreis: 214,
        altersgruppen: ['jugendlicher'],
      },
      {
        id: skipassKind,
        bezeichnung: 'Silvapark Galtür – 6 Tage, Kinder',
        tage: 6,
        ekPreis: 134,
        vkPreis: 134,
        altersgruppen: ['kind', 'kleinkind'],
      },
    ],
    ausgaben: [
      {
        id: neueId(),
        bezeichnung: 'Halbpension Unterkunft',
        kategorie: 'unterkunft',
        art: 'proNacht',
        betrag: 62,
        bezahlt: false,
      },
      {
        id: neueId(),
        bezeichnung: 'Bus (Hin- und Rückfahrt)',
        kategorie: 'fahrt',
        art: 'fix',
        betrag: 2800,
        bezahlt: false,
      },
      {
        id: neueId(),
        bezeichnung: 'Kurtaxe',
        kategorie: 'unterkunft',
        art: 'proNacht',
        betrag: 3.1,
        bezahlt: false,
      },
    ],
  }
}
