import { neueId } from '../lib/id'
import type { AusfahrtDaten, Zimmer } from './types'

export const DATEN_VERSION = 2

/**
 * Offizielle Preisliste der Bergbahnen Galtür. Die Tarife ändern sich jede
 * Saison, deshalb steht in der App die Quelle statt geratener Zahlen.
 */
export const SKIPASS_QUELLE = {
  name: 'Bergbahnen Galtür – Skipasspreise Silvapark',
  url: 'https://www.galtuer.com/de/winter/betriebszeiten-preise/skipasspreise-silvapark',
} as const

const PREIS_NOCH_EINTRAGEN =
  'Einkaufs- und Verkaufspreis der aktuellen Saison noch eintragen (siehe Preisliste der Bergbahnen).'

/**
 * Zimmer der Unterkunft. Sie bleiben von Jahr zu Jahr gleich und sind deshalb
 * fest hinterlegt: 24 Zimmer mit zusammen 56 Betten, verteilt auf das
 * Haupthaus, das benachbarte Drei Länder Hotel (DL) und das Mitarbeiterzimmer
 * (MAZ), das nicht jede Saison zur Verfügung steht.
 */
interface ZimmerVorlage {
  bezeichnung: string
  betten: number
  haus: string
  verfuegbar?: boolean
  notiz?: string
}

const HAUPTHAUS_EG = 'Haupthaus, Erdgeschoss'
const HAUPTHAUS_1 = 'Haupthaus, 1. Obergeschoss'
const HAUPTHAUS_2 = 'Haupthaus, 2. Obergeschoss'
const NACHBARHAUS = 'Drei Länder Hotel (Nachbarhaus)'

const ZIMMERPLAN: ZimmerVorlage[] = [
  { bezeichnung: '01', betten: 2, haus: HAUPTHAUS_EG },
  { bezeichnung: '02', betten: 2, haus: HAUPTHAUS_EG },
  { bezeichnung: '03', betten: 2, haus: HAUPTHAUS_EG },
  { bezeichnung: '04', betten: 1, haus: HAUPTHAUS_EG },
  { bezeichnung: '05', betten: 2, haus: HAUPTHAUS_EG },
  { bezeichnung: '101', betten: 3, haus: HAUPTHAUS_1 },
  { bezeichnung: '102', betten: 3, haus: HAUPTHAUS_1 },
  { bezeichnung: '103', betten: 2, haus: HAUPTHAUS_1 },
  { bezeichnung: '104', betten: 2, haus: HAUPTHAUS_1 },
  { bezeichnung: '105', betten: 2, haus: HAUPTHAUS_1 },
  { bezeichnung: '106', betten: 5, haus: HAUPTHAUS_1 },
  { bezeichnung: '107', betten: 1, haus: HAUPTHAUS_1 },
  { bezeichnung: '108', betten: 5, haus: HAUPTHAUS_1 },
  { bezeichnung: '201', betten: 3, haus: HAUPTHAUS_2 },
  { bezeichnung: '202', betten: 3, haus: HAUPTHAUS_2 },
  { bezeichnung: '203', betten: 2, haus: HAUPTHAUS_2 },
  { bezeichnung: '204', betten: 1, haus: HAUPTHAUS_2 },
  { bezeichnung: '205', betten: 2, haus: HAUPTHAUS_2 },
  { bezeichnung: '206', betten: 3, haus: HAUPTHAUS_2 },
  { bezeichnung: 'DL1', betten: 2, haus: NACHBARHAUS },
  { bezeichnung: 'DL2', betten: 3, haus: NACHBARHAUS },
  { bezeichnung: 'DL3', betten: 2, haus: NACHBARHAUS },
  { bezeichnung: 'DL4', betten: 2, haus: NACHBARHAUS },
  {
    bezeichnung: 'MAZ',
    betten: 1,
    haus: 'Mitarbeiterzimmer',
    notiz:
      'Steht nicht jedes Jahr zur Verfügung und ist einfach ausgestattet. Wenn der Vermieter es dieses Jahr nicht freigibt, hier auf „nicht verfügbar“ stellen.',
  },
]

function kategorie(betten: number): string {
  if (betten === 1) return 'Einzelzimmer'
  if (betten === 2) return 'Doppelzimmer'
  return `${betten}-Bett-Zimmer`
}

/** Legt den Zimmerplan der Unterkunft mit frischen IDs an. */
export function erstelleZimmerplan(): Zimmer[] {
  return ZIMMERPLAN.map((vorlage) => ({
    id: neueId(),
    bezeichnung: vorlage.bezeichnung,
    haus: vorlage.haus,
    kategorie: kategorie(vorlage.betten),
    betten: vorlage.betten,
    verfuegbar: vorlage.verfuegbar ?? true,
    zuschlagProPerson: 0,
    notiz: vorlage.notiz,
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
      skipassPreisstand: undefined,
    },
    teilnehmer: [],
    zimmer: erstelleZimmerplan(),
    skipassTypen: [
      {
        id: skipassErwachsen,
        bezeichnung: 'Silvapark Galtür – 6 Tage, Erwachsene',
        tage: 6,
        ekPreis: 0,
        vkPreis: 0,
        altersgruppen: ['erwachsener'],
        notiz: PREIS_NOCH_EINTRAGEN,
      },
      {
        id: skipassJugend,
        bezeichnung: 'Silvapark Galtür – 6 Tage, Jugendliche',
        tage: 6,
        ekPreis: 0,
        vkPreis: 0,
        altersgruppen: ['jugendlicher'],
        notiz: PREIS_NOCH_EINTRAGEN,
      },
      {
        id: skipassKind,
        bezeichnung: 'Silvapark Galtür – 6 Tage, Kinder',
        tage: 6,
        ekPreis: 0,
        vkPreis: 0,
        altersgruppen: ['kind', 'kleinkind'],
        notiz: PREIS_NOCH_EINTRAGEN,
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
