import {
  ZAHLENDE_STATUS,
  type Ausgabe,
  type AusfahrtDaten,
  type SkipassTyp,
  type Teilnehmer,
  type Zimmer,
} from './types'

/** Anzahl der Übernachtungen zwischen An- und Abreise. */
export function naechte(anreise: string, abreise: string): number {
  const von = Date.parse(anreise)
  const bis = Date.parse(abreise)
  if (Number.isNaN(von) || Number.isNaN(bis)) return 0
  return Math.max(0, Math.round((bis - von) / 86_400_000))
}

export interface Teilnehmerpreis {
  grundpreis: number
  zimmerzuschlag: number
  skipass: number
  zusatzposten: number
  rabatt: number
  gesamt: number
  bezahlt: number
  offen: number
}

export function berechneTeilnehmerpreis(
  teilnehmer: Teilnehmer,
  daten: Pick<AusfahrtDaten, 'preise' | 'zimmer' | 'skipassTypen'>,
): Teilnehmerpreis {
  const grundpreisSatz = daten.preise.grundpreise[teilnehmer.altersgruppe]
  const grundpreis = teilnehmer.mitglied
    ? (grundpreisSatz?.mitglied ?? 0)
    : (grundpreisSatz?.gast ?? 0)

  const zimmer = daten.zimmer.find((z) => z.id === teilnehmer.zimmerId)
  const zimmerzuschlag = zimmer?.zuschlagProPerson ?? 0

  const pass = daten.skipassTypen.find((s) => s.id === teilnehmer.skipassTypId)
  const skipass = pass?.vkPreis ?? 0

  const zusatzposten = teilnehmer.zusatzposten.reduce(
    (summe, posten) => summe + posten.betrag,
    0,
  )
  const rabatt = teilnehmer.rabatt || 0

  // Stornierte und beitragsfreie Teilnehmer zahlen nichts. Beitragsfreie
  // belegen aber weiter ein Bett und verursachen Kosten – sie bleiben deshalb
  // in der Personenzahl der Hochrechnung.
  const gesamt =
    teilnehmer.status === 'storniert' || teilnehmer.beitragsfrei
      ? 0
      : grundpreis + zimmerzuschlag + skipass + zusatzposten - rabatt

  const bezahlt = teilnehmer.zahlungen.reduce((summe, z) => summe + z.betrag, 0)

  return {
    grundpreis,
    zimmerzuschlag,
    skipass,
    zusatzposten,
    rabatt,
    gesamt,
    bezahlt,
    offen: gesamt - bezahlt,
  }
}

export function istZahlend(teilnehmer: Teilnehmer): boolean {
  return ZAHLENDE_STATUS.includes(teilnehmer.status)
}

export interface AusgabenPosten {
  ausgabe: Ausgabe
  /** Auf die Ausfahrt hochgerechneter Gesamtbetrag. */
  summe: number
}

export function hochrechnenAusgabe(
  ausgabe: Ausgabe,
  personen: number,
  anzahlNaechte: number,
): number {
  switch (ausgabe.art) {
    case 'fix':
      return ausgabe.betrag
    case 'proPerson':
      return ausgabe.betrag * personen
    case 'proNacht':
      return ausgabe.betrag * personen * anzahlNaechte
  }
}

export interface Kalkulation {
  personen: number
  naechte: number
  einnahmen: number
  bereitsBezahlt: number
  offeneForderungen: number
  ausgabenPosten: AusgabenPosten[]
  skipassEinkauf: number
  ausgaben: number
  saldo: number
  saldoProPerson: number
  /** Kostendeckungsgrad in Prozent (100 = exakte Null-auf-Null). */
  deckungsgrad: number
}

export function berechneKalkulation(daten: AusfahrtDaten): Kalkulation {
  const zahlende = daten.teilnehmer.filter(istZahlend)
  const personen = zahlende.length
  const anzahlNaechte = naechte(daten.ausfahrt.anreise, daten.ausfahrt.abreise)

  let einnahmen = 0
  let bereitsBezahlt = 0
  for (const teilnehmer of zahlende) {
    const preis = berechneTeilnehmerpreis(teilnehmer, daten)
    einnahmen += preis.gesamt
    bereitsBezahlt += preis.bezahlt
  }
  // Zahlungen stornierter Teilnehmer bleiben als Guthaben sichtbar, fließen
  // aber nicht in die Einnahmen ein.

  const ausgabenPosten: AusgabenPosten[] = daten.ausgaben.map((ausgabe) => ({
    ausgabe,
    summe: hochrechnenAusgabe(ausgabe, personen, anzahlNaechte),
  }))

  const skipassEinkauf = daten.preise.skipassEinkaufAutomatisch
    ? summeSkipassEinkauf(zahlende, daten.skipassTypen)
    : 0

  const ausgaben =
    ausgabenPosten.reduce((summe, posten) => summe + posten.summe, 0) +
    skipassEinkauf

  const saldo = einnahmen - ausgaben

  return {
    personen,
    naechte: anzahlNaechte,
    einnahmen,
    bereitsBezahlt,
    offeneForderungen: einnahmen - bereitsBezahlt,
    ausgabenPosten,
    skipassEinkauf,
    ausgaben,
    saldo,
    saldoProPerson: personen > 0 ? saldo / personen : 0,
    deckungsgrad: ausgaben > 0 ? (einnahmen / ausgaben) * 100 : 0,
  }
}

export function summeSkipassEinkauf(
  teilnehmer: Teilnehmer[],
  skipassTypen: SkipassTyp[],
): number {
  return teilnehmer.reduce((summe, t) => {
    const pass = skipassTypen.find((s) => s.id === t.skipassTypId)
    return summe + (pass?.ekPreis ?? 0)
  }, 0)
}

export interface Zimmerbelegung {
  zimmer: Zimmer
  belegt: Teilnehmer[]
  freieBetten: number
  ueberbelegt: boolean
}

export function berechneZimmerbelegung(
  zimmer: Zimmer[],
  teilnehmer: Teilnehmer[],
): Zimmerbelegung[] {
  return zimmer.map((z) => {
    const belegt = teilnehmer.filter(
      (t) => t.zimmerId === z.id && t.status !== 'storniert',
    )
    return {
      zimmer: z,
      belegt,
      freieBetten: z.betten - belegt.length,
      ueberbelegt: belegt.length > z.betten,
    }
  })
}

/** Teilnehmer, die noch kein Zimmer haben (ohne Stornierungen). */
export function ohneZimmer(teilnehmer: Teilnehmer[]): Teilnehmer[] {
  return teilnehmer.filter((t) => !t.zimmerId && t.status !== 'storniert')
}

export interface Verpflegungswunsch {
  bezeichnung: string
  anzahl: number
}

/** Zusammenfassung der Verpflegungswünsche für die Unterkunft. */
export function berechneVerpflegung(teilnehmer: Teilnehmer[]): Verpflegungswunsch[] {
  const zaehler = new Map<string, number>()
  for (const person of teilnehmer) {
    if (person.status === 'storniert') continue
    const wunsch = person.verpflegung?.trim()
    if (!wunsch) continue
    zaehler.set(wunsch, (zaehler.get(wunsch) ?? 0) + 1)
  }
  return [...zaehler.entries()]
    .map(([bezeichnung, anzahl]) => ({ bezeichnung, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.bezeichnung.localeCompare(b.bezeichnung, 'de'))
}

export interface SkipassBedarf {
  typ: SkipassTyp
  anzahl: number
  ekSumme: number
  vkSumme: number
  marge: number
}

export function berechneSkipassBedarf(
  teilnehmer: Teilnehmer[],
  skipassTypen: SkipassTyp[],
): SkipassBedarf[] {
  const zahlende = teilnehmer.filter(istZahlend)
  return skipassTypen.map((typ) => {
    const anzahl = zahlende.filter((t) => t.skipassTypId === typ.id).length
    const ekSumme = anzahl * typ.ekPreis
    const vkSumme = anzahl * typ.vkPreis
    return { typ, anzahl, ekSumme, vkSumme, marge: vkSumme - ekSumme }
  })
}
