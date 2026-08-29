import { neueId } from '../lib/id'
import type { AusfahrtDaten, Zimmer } from './types'

export const DATEN_VERSION = 2

/**
 * Zimmer der Unterkunft. Sie bleiben von Jahr zu Jahr gleich und sind deshalb
 * fest hinterlegt – Bettenzahlen lassen sich in der Zimmerverwaltung anpassen.
 *
 * Die Bettenzahlen stammen aus der Belegung der letzten Ausfahrt (56 Plätze in
 * 24 Zimmern) und sind damit die tatsächlich genutzte, nicht zwingend die
 * maximale Kapazität.
 */
const ZIMMERPLAN: [bezeichnung: string, betten: number, bereich: string][] = [
  ['01', 2, 'Erdgeschoss'],
  ['02', 2, 'Erdgeschoss'],
  ['03', 2, 'Erdgeschoss'],
  ['04', 1, 'Erdgeschoss'],
  ['05', 2, 'Erdgeschoss'],
  ['101', 3, '1. Obergeschoss'],
  ['102', 3, '1. Obergeschoss'],
  ['103', 2, '1. Obergeschoss'],
  ['104', 2, '1. Obergeschoss'],
  ['105', 2, '1. Obergeschoss'],
  ['106', 5, '1. Obergeschoss'],
  ['107', 1, '1. Obergeschoss'],
  ['108', 5, '1. Obergeschoss'],
  ['201', 3, '2. Obergeschoss'],
  ['202', 3, '2. Obergeschoss'],
  ['203', 2, '2. Obergeschoss'],
  ['204', 1, '2. Obergeschoss'],
  ['205', 2, '2. Obergeschoss'],
  ['206', 3, '2. Obergeschoss'],
  ['DL1', 2, 'DL'],
  ['DL2', 3, 'DL'],
  ['DL3', 2, 'DL'],
  ['DL4', 2, 'DL'],
  ['MAZ', 1, 'MAZ'],
]

function kategorie(betten: number): string {
  if (betten === 1) return 'Einzelzimmer'
  if (betten === 2) return 'Doppelzimmer'
  return `${betten}-Bett-Zimmer`
}

/** Legt den Zimmerplan der Unterkunft mit frischen IDs an. */
export function erstelleZimmerplan(): Zimmer[] {
  return ZIMMERPLAN.map(([bezeichnung, betten, bereich]) => ({
    id: neueId(),
    bezeichnung,
    haus: bereich,
    kategorie: kategorie(betten),
    betten,
    zuschlagProPerson: 0,
  }))
}

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
    zimmer: erstelleZimmerplan(),
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
