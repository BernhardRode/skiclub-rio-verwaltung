import { describe, expect, it } from 'vitest'
import {
  berechneKalkulation,
  berechneSkipassBedarf,
  berechneTeilnehmerpreis,
  berechneZimmerbelegung,
  hochrechnenAusgabe,
  naechte,
  ohneZimmer,
} from './kalkulation'
import type {
  AusfahrtDaten,
  Ausgabe,
  SkipassTyp,
  Teilnehmer,
  Zimmer,
} from './types'

const skipassErwachsen: SkipassTyp = {
  id: 'pass-1',
  bezeichnung: '6 Tage Erwachsene',
  tage: 6,
  ekPreis: 260,
  vkPreis: 280,
  altersgruppen: ['erwachsener'],
}

const doppelzimmer: Zimmer = {
  id: 'zi-1',
  bezeichnung: 'Zimmer 1',
  kategorie: 'Doppelzimmer',
  betten: 2,
  zuschlagProPerson: 0,
}

const einzelzimmer: Zimmer = {
  id: 'zi-2',
  bezeichnung: 'Zimmer 2',
  kategorie: 'Einzelzimmer',
  betten: 1,
  zuschlagProPerson: 90,
}

function teilnehmer(ueberschreibung: Partial<Teilnehmer> = {}): Teilnehmer {
  return {
    id: 'tn-1',
    vorname: 'Anna',
    nachname: 'Muster',
    altersgruppe: 'erwachsener',
    mitglied: true,
    status: 'bestaetigt',
    zusatzposten: [],
    rabatt: 0,
    zahlungen: [],
    angemeldetAm: '2026-09-01',
    ...ueberschreibung,
  }
}

function daten(ueberschreibung: Partial<AusfahrtDaten> = {}): AusfahrtDaten {
  return {
    version: 1,
    ausfahrt: {
      titel: 'Testausfahrt',
      jahr: 2027,
      ort: 'Galtür',
      unterkunft: '',
      anreise: '2027-01-16',
      abreise: '2027-01-23',
    },
    preise: {
      grundpreise: {
        erwachsener: { mitglied: 400, gast: 500 },
        jugendlicher: { mitglied: 300, gast: 380 },
        kind: { mitglied: 200, gast: 250 },
        kleinkind: { mitglied: 0, gast: 0 },
      },
      skipassEinkaufAutomatisch: true,
    },
    teilnehmer: [],
    zimmer: [doppelzimmer, einzelzimmer],
    skipassTypen: [skipassErwachsen],
    ausgaben: [],
    ...ueberschreibung,
  }
}

describe('naechte', () => {
  it('zählt die Übernachtungen zwischen zwei Daten', () => {
    expect(naechte('2027-01-16', '2027-01-23')).toBe(7)
  })

  it('liefert 0 bei ungültigen oder verdrehten Daten', () => {
    expect(naechte('', '2027-01-23')).toBe(0)
    expect(naechte('2027-01-23', '2027-01-16')).toBe(0)
  })
})

describe('berechneTeilnehmerpreis', () => {
  it('nutzt den Mitgliedspreis für Mitglieder', () => {
    const preis = berechneTeilnehmerpreis(teilnehmer(), daten())
    expect(preis.grundpreis).toBe(400)
    expect(preis.gesamt).toBe(400)
  })

  it('nutzt den höheren Gastpreis für Nichtmitglieder', () => {
    const preis = berechneTeilnehmerpreis(teilnehmer({ mitglied: false }), daten())
    expect(preis.grundpreis).toBe(500)
  })

  it('addiert Zimmerzuschlag, Skipass und Zusatzposten und zieht den Rabatt ab', () => {
    const preis = berechneTeilnehmerpreis(
      teilnehmer({
        zimmerId: 'zi-2',
        skipassTypId: 'pass-1',
        zusatzposten: [{ id: 'zp-1', bezeichnung: 'Leihski', betrag: 60 }],
        rabatt: 30,
      }),
      daten(),
    )
    expect(preis.zimmerzuschlag).toBe(90)
    expect(preis.skipass).toBe(280)
    expect(preis.zusatzposten).toBe(60)
    // 400 + 90 + 280 + 60 − 30
    expect(preis.gesamt).toBe(800)
  })

  it('setzt stornierte Anmeldungen auf 0, behält Zahlungen aber sichtbar', () => {
    const preis = berechneTeilnehmerpreis(
      teilnehmer({
        status: 'storniert',
        zahlungen: [{ id: 'za-1', datum: '2026-10-01', betrag: 100 }],
      }),
      daten(),
    )
    expect(preis.gesamt).toBe(0)
    expect(preis.bezahlt).toBe(100)
    expect(preis.offen).toBe(-100)
  })

  it('berechnet den offenen Betrag aus allen Zahlungen', () => {
    const preis = berechneTeilnehmerpreis(
      teilnehmer({
        zahlungen: [
          { id: 'za-1', datum: '2026-10-01', betrag: 150 },
          { id: 'za-2', datum: '2026-12-01', betrag: 100 },
        ],
      }),
      daten(),
    )
    expect(preis.bezahlt).toBe(250)
    expect(preis.offen).toBe(150)
  })

  it('fällt auf 0 zurück, wenn ein Skipass oder Zimmer nicht mehr existiert', () => {
    const preis = berechneTeilnehmerpreis(
      teilnehmer({ zimmerId: 'weg', skipassTypId: 'weg' }),
      daten(),
    )
    expect(preis.gesamt).toBe(400)
  })
})

describe('hochrechnenAusgabe', () => {
  const basis: Ausgabe = {
    id: 'a-1',
    bezeichnung: 'Test',
    kategorie: 'sonstiges',
    art: 'fix',
    betrag: 100,
    bezahlt: false,
  }

  it('lässt Pauschalbeträge unverändert', () => {
    expect(hochrechnenAusgabe(basis, 10, 7)).toBe(100)
  })

  it('multipliziert Pro-Person-Beträge mit der Personenzahl', () => {
    expect(hochrechnenAusgabe({ ...basis, art: 'proPerson' }, 10, 7)).toBe(1000)
  })

  it('multipliziert Pro-Nacht-Beträge mit Personen und Nächten', () => {
    expect(hochrechnenAusgabe({ ...basis, art: 'proNacht' }, 10, 7)).toBe(7000)
  })
})

describe('berechneKalkulation', () => {
  const zweiTeilnehmer = [
    teilnehmer({ id: 'tn-1', skipassTypId: 'pass-1', zimmerId: 'zi-1' }),
    teilnehmer({
      id: 'tn-2',
      vorname: 'Ben',
      mitglied: false,
      skipassTypId: 'pass-1',
      zimmerId: 'zi-1',
      zahlungen: [{ id: 'za-1', datum: '2026-11-01', betrag: 300 }],
    }),
  ]

  it('summiert Einnahmen, Ausgaben und Saldo', () => {
    const k = berechneKalkulation(
      daten({
        teilnehmer: zweiTeilnehmer,
        ausgaben: [
          {
            id: 'a-1',
            bezeichnung: 'Bus',
            kategorie: 'fahrt',
            art: 'fix',
            betrag: 600,
            bezahlt: false,
          },
        ],
      }),
    )
    expect(k.personen).toBe(2)
    expect(k.naechte).toBe(7)
    // (400 + 280) + (500 + 280)
    expect(k.einnahmen).toBe(1460)
    // 600 Bus + 2 × 260 Skipass-Einkauf
    expect(k.ausgaben).toBe(1120)
    expect(k.saldo).toBe(340)
    expect(k.saldoProPerson).toBe(170)
  })

  it('zählt Warteliste und Stornierungen nicht als zahlende Personen', () => {
    const k = berechneKalkulation(
      daten({
        teilnehmer: [
          teilnehmer({ id: 'tn-1' }),
          teilnehmer({ id: 'tn-2', status: 'warteliste' }),
          teilnehmer({ id: 'tn-3', status: 'storniert' }),
        ],
      }),
    )
    expect(k.personen).toBe(1)
    expect(k.einnahmen).toBe(400)
  })

  it('lässt den Skipass-Einkauf weg, wenn er manuell erfasst wird', () => {
    const basis = daten({ teilnehmer: zweiTeilnehmer })
    const k = berechneKalkulation({
      ...basis,
      preise: { ...basis.preise, skipassEinkaufAutomatisch: false },
    })
    expect(k.skipassEinkauf).toBe(0)
    expect(k.ausgaben).toBe(0)
  })

  it('weist offene Forderungen aus', () => {
    const k = berechneKalkulation(daten({ teilnehmer: zweiTeilnehmer }))
    expect(k.bereitsBezahlt).toBe(300)
    expect(k.offeneForderungen).toBe(1160)
  })

  it('bleibt bei null Teilnehmern stabil', () => {
    const k = berechneKalkulation(daten())
    expect(k.personen).toBe(0)
    expect(k.saldoProPerson).toBe(0)
    expect(k.deckungsgrad).toBe(0)
  })

  it('erreicht bei ausgeglichener Rechnung 100 % Deckungsgrad', () => {
    const k = berechneKalkulation(
      daten({
        teilnehmer: [teilnehmer()],
        ausgaben: [
          {
            id: 'a-1',
            bezeichnung: 'Unterkunft',
            kategorie: 'unterkunft',
            art: 'fix',
            betrag: 400,
            bezahlt: false,
          },
        ],
      }),
    )
    expect(k.saldo).toBe(0)
    expect(k.deckungsgrad).toBe(100)
  })
})

describe('Zimmerbelegung', () => {
  it('erkennt freie Betten und Überbelegung', () => {
    const belegung = berechneZimmerbelegung(
      [doppelzimmer, einzelzimmer],
      [
        teilnehmer({ id: 'tn-1', zimmerId: 'zi-1' }),
        teilnehmer({ id: 'tn-2', zimmerId: 'zi-2' }),
        teilnehmer({ id: 'tn-3', zimmerId: 'zi-2' }),
      ],
    )
    expect(belegung[0].freieBetten).toBe(1)
    expect(belegung[0].ueberbelegt).toBe(false)
    expect(belegung[1].belegt).toHaveLength(2)
    expect(belegung[1].ueberbelegt).toBe(true)
  })

  it('belegt kein Bett mit stornierten Anmeldungen', () => {
    const belegung = berechneZimmerbelegung(
      [doppelzimmer],
      [teilnehmer({ id: 'tn-1', zimmerId: 'zi-1', status: 'storniert' })],
    )
    expect(belegung[0].belegt).toHaveLength(0)
    expect(belegung[0].freieBetten).toBe(2)
  })

  it('listet Personen ohne Zimmer ohne Stornierungen', () => {
    const offen = ohneZimmer([
      teilnehmer({ id: 'tn-1' }),
      teilnehmer({ id: 'tn-2', zimmerId: 'zi-1' }),
      teilnehmer({ id: 'tn-3', status: 'storniert' }),
    ])
    expect(offen.map((t) => t.id)).toEqual(['tn-1'])
  })
})

describe('berechneSkipassBedarf', () => {
  it('zählt Pässe je Typ und weist die Differenz aus', () => {
    const bedarf = berechneSkipassBedarf(
      [
        teilnehmer({ id: 'tn-1', skipassTypId: 'pass-1' }),
        teilnehmer({ id: 'tn-2', skipassTypId: 'pass-1' }),
        teilnehmer({ id: 'tn-3', skipassTypId: 'pass-1', status: 'storniert' }),
      ],
      [skipassErwachsen],
    )
    expect(bedarf[0].anzahl).toBe(2)
    expect(bedarf[0].ekSumme).toBe(520)
    expect(bedarf[0].vkSumme).toBe(560)
    expect(bedarf[0].marge).toBe(40)
  })
})
