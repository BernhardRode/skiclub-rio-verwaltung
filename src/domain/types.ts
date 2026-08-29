/** Datenmodell der Ausfahrtsverwaltung. */

export type Altersgruppe = 'erwachsener' | 'jugendlicher' | 'kind' | 'kleinkind'

export type TeilnehmerStatus =
  | 'angemeldet'
  | 'bestaetigt'
  | 'warteliste'
  | 'storniert'

/** Ausgaben wirken entweder pauschal, pro Person oder pro Person und Nacht. */
export type AusgabenArt = 'fix' | 'proPerson' | 'proNacht'

export type AusgabenKategorie =
  | 'unterkunft'
  | 'verpflegung'
  | 'fahrt'
  | 'skipass'
  | 'programm'
  | 'sonstiges'

export interface Zusatzposten {
  id: string
  bezeichnung: string
  betrag: number
}

export interface Zahlung {
  id: string
  datum: string
  betrag: number
  notiz?: string
}

export interface Teilnehmer {
  id: string
  vorname: string
  nachname: string
  email?: string
  telefon?: string
  geburtsdatum?: string
  altersgruppe: Altersgruppe
  mitglied: boolean
  status: TeilnehmerStatus
  zimmerId?: string
  skipassTypId?: string
  /** Verpflegungswunsch bzw. Unverträglichkeit, z. B. „Vegetarisch“. */
  verpflegung?: string
  /**
   * Nimmt kostenlos teil (Busfahrer, Helfer). Zählt bei den Kosten und im
   * Zimmerplan mit, zahlt aber keinen Beitrag.
   */
  beitragsfrei: boolean
  /** Individuelle Zusatzkosten, z. B. Leihski oder Einzeltransfer. */
  zusatzposten: Zusatzposten[]
  rabatt: number
  rabattGrund?: string
  zahlungen: Zahlung[]
  notiz?: string
  angemeldetAm: string
}

export interface Zimmer {
  id: string
  bezeichnung: string
  haus?: string
  kategorie: string
  betten: number
  /**
   * Steht das Zimmer in dieser Saison zur Verfügung? Nicht verfügbare Zimmer
   * bleiben im Plan erhalten, zählen aber nicht zur Bettenzahl.
   */
  verfuegbar: boolean
  /** Aufschlag bzw. Abschlag pro Person für die gesamte Ausfahrt. */
  zuschlagProPerson: number
  notiz?: string
}

export interface SkipassTyp {
  id: string
  bezeichnung: string
  tage: number
  /** Einkaufspreis, den der Verein an die Bergbahn zahlt. */
  ekPreis: number
  /** Verkaufspreis, den der Teilnehmer zahlt. */
  vkPreis: number
  /** Für welche Altersgruppen der Pass gilt (leer = alle). */
  altersgruppen: Altersgruppe[]
  notiz?: string
}

export interface Ausgabe {
  id: string
  bezeichnung: string
  kategorie: AusgabenKategorie
  art: AusgabenArt
  betrag: number
  bezahlt: boolean
  faelligAm?: string
  notiz?: string
}

export interface Grundpreis {
  mitglied: number
  gast: number
}

export interface Preise {
  grundpreise: Record<Altersgruppe, Grundpreis>
  /**
   * Skipass-Einkauf automatisch als Ausgabe verbuchen (Summe der EK-Preise
   * aller zugeordneten Pässe). Verhindert doppelte Erfassung.
   */
  skipassEinkaufAutomatisch: boolean
}

export interface Ausfahrt {
  titel: string
  jahr: number
  ort: string
  unterkunft: string
  anreise: string
  abreise: string
  anmeldeschluss?: string
  ansprechpartner?: string
  kontaktEmail?: string
  hinweis?: string
}

export interface AusfahrtDaten {
  version: number
  ausfahrt: Ausfahrt
  preise: Preise
  teilnehmer: Teilnehmer[]
  zimmer: Zimmer[]
  skipassTypen: SkipassTyp[]
  ausgaben: Ausgabe[]
}

export const ALTERSGRUPPEN: Altersgruppe[] = [
  'erwachsener',
  'jugendlicher',
  'kind',
  'kleinkind',
]

export const ALTERSGRUPPE_LABEL: Record<Altersgruppe, string> = {
  erwachsener: 'Erwachsene',
  jugendlicher: 'Jugendliche (15–17)',
  kind: 'Kinder (6–14)',
  kleinkind: 'Kleinkinder (0–5)',
}

export const STATUS_LABEL: Record<TeilnehmerStatus, string> = {
  angemeldet: 'Angemeldet',
  bestaetigt: 'Bestätigt',
  warteliste: 'Warteliste',
  storniert: 'Storniert',
}

export const AUSGABEN_ART_LABEL: Record<AusgabenArt, string> = {
  fix: 'Pauschal',
  proPerson: 'pro Person',
  proNacht: 'pro Person & Nacht',
}

export const AUSGABEN_KATEGORIE_LABEL: Record<AusgabenKategorie, string> = {
  unterkunft: 'Unterkunft',
  verpflegung: 'Verpflegung',
  fahrt: 'Fahrt',
  skipass: 'Skipass',
  programm: 'Programm',
  sonstiges: 'Sonstiges',
}

/** Gängige Verpflegungswünsche als Vorschlagsliste. */
export const VERPFLEGUNG_VORSCHLAEGE = [
  'Vegetarisch',
  'Vegan',
  'Glutenfrei',
  'Laktosefrei',
]

/** Diese Status zählen als zahlende Teilnehmer in der Kalkulation. */
export const ZAHLENDE_STATUS: TeilnehmerStatus[] = ['angemeldet', 'bestaetigt']
