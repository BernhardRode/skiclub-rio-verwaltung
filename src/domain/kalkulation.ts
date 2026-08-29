import {
  ALTERSGRUPPEN,
  ZAHLENDE_STATUS,
  type Altersgruppe,
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

/** Betten, die in dieser Saison tatsächlich zur Verfügung stehen. */
export function verfuegbareBetten(zimmer: Zimmer[]): number {
  return zimmer.reduce((summe, z) => summe + (z.verfuegbar ? z.betten : 0), 0)
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
    // Ein gesperrtes Zimmer hat keine freien Betten; wer noch drin liegt,
    // gilt als überbelegt und fällt damit auf der Zimmerseite auf.
    const kapazitaet = z.verfuegbar ? z.betten : 0
    return {
      zimmer: z,
      belegt,
      freieBetten: kapazitaet - belegt.length,
      ueberbelegt: belegt.length > kapazitaet,
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

export interface PassOption {
  typ: SkipassTyp
  anzahl: number
  ekSumme: number
  vkSumme: number
  /** Günstigster vergleichbarer Pass der Altersgruppe. */
  empfohlen: boolean
  /** Mehrkosten gegenüber der Empfehlung. */
  mehrkosten: number
}

export interface GruppenEmpfehlung {
  altersgruppe: Altersgruppe
  personen: number
  /** Vergleichbare Pässe, günstigster zuerst. */
  optionen: PassOption[]
  empfehlung?: SkipassTyp
  /** Passende Typen, bei denen der Einkaufspreis fehlt. */
  ohnePreis: SkipassTyp[]
}

export interface Bestellposten {
  typ: SkipassTyp
  anzahl: number
  ekSumme: number
  vkSumme: number
}

export interface SkipassEmpfehlung {
  gruppen: GruppenEmpfehlung[]
  bestellung: Bestellposten[]
  ekGesamt: number
  vkGesamt: number
  /** Was die jeweils teuerste passende Variante kosten würde. */
  teuersteEk: number
  ersparnis: number
  /** Einkaufswert der aktuell von Hand gesetzten Zuordnung. */
  aktuellEk: number
  /** Nur dann ist der Vergleich mit der aktuellen Zuordnung aussagekräftig. */
  aktuellVollstaendig: boolean
  /** Personen, für die kein Pass mit Preis hinterlegt ist. */
  personenOhneOption: number
}

/** Ein Pass ist nur vergleichbar, wenn sein Einkaufspreis feststeht. */
function istVergleichbar(typ: SkipassTyp): boolean {
  return typ.ekPreis > 0
}

function giltFuer(typ: SkipassTyp, altersgruppe: Altersgruppe): boolean {
  return typ.altersgruppen.length === 0 || typ.altersgruppen.includes(altersgruppe)
}

/**
 * Beantwortet die Bestellfrage: Welche Pässe kaufen wir für die angemeldete
 * Gruppe, und was kosten die Alternativen? Verglichen wird über den
 * Einkaufspreis – das ist der Betrag, den der Verein an die Bergbahn zahlt.
 */
export function berechneSkipassEmpfehlung(
  daten: Pick<AusfahrtDaten, 'teilnehmer' | 'skipassTypen'>,
): SkipassEmpfehlung {
  const zahlende = daten.teilnehmer.filter(istZahlend)
  const gruppen: GruppenEmpfehlung[] = []
  const bestellMenge = new Map<string, number>()
  let teuersteEk = 0
  let personenOhneOption = 0

  for (const altersgruppe of ALTERSGRUPPEN) {
    const personen = zahlende.filter((t) => t.altersgruppe === altersgruppe).length
    if (personen === 0) continue

    const passend = daten.skipassTypen.filter((typ) => giltFuer(typ, altersgruppe))
    const vergleichbar = passend
      .filter(istVergleichbar)
      .sort((a, b) => a.ekPreis - b.ekPreis)
    const guenstigster = vergleichbar[0]

    if (guenstigster) {
      bestellMenge.set(guenstigster.id, (bestellMenge.get(guenstigster.id) ?? 0) + personen)
      teuersteEk += vergleichbar[vergleichbar.length - 1].ekPreis * personen
    } else {
      personenOhneOption += personen
    }

    gruppen.push({
      altersgruppe,
      personen,
      optionen: vergleichbar.map((typ) => ({
        typ,
        anzahl: personen,
        ekSumme: typ.ekPreis * personen,
        vkSumme: typ.vkPreis * personen,
        empfohlen: typ.id === guenstigster?.id,
        mehrkosten: (typ.ekPreis - (guenstigster?.ekPreis ?? 0)) * personen,
      })),
      empfehlung: guenstigster,
      ohnePreis: passend.filter((typ) => !istVergleichbar(typ)),
    })
  }

  const bestellung: Bestellposten[] = [...bestellMenge.entries()]
    .map(([typId, anzahl]) => {
      const typ = daten.skipassTypen.find((t) => t.id === typId)!
      return {
        typ,
        anzahl,
        ekSumme: typ.ekPreis * anzahl,
        vkSumme: typ.vkPreis * anzahl,
      }
    })
    .sort((a, b) => b.ekSumme - a.ekSumme)

  const ekGesamt = bestellung.reduce((summe, posten) => summe + posten.ekSumme, 0)
  const vkGesamt = bestellung.reduce((summe, posten) => summe + posten.vkSumme, 0)

  const aktuellEk = summeSkipassEinkauf(zahlende, daten.skipassTypen)
  const aktuellVollstaendig =
    zahlende.length > 0 && zahlende.every((t) => t.skipassTypId)

  return {
    gruppen,
    bestellung,
    ekGesamt,
    vkGesamt,
    teuersteEk,
    ersparnis: teuersteEk - ekGesamt,
    aktuellEk,
    aktuellVollstaendig,
    personenOhneOption,
  }
}
