import { describe, expect, it } from 'vitest'
import { berechneSkipassEmpfehlung } from './kalkulation'
import type { SkipassTyp, Teilnehmer } from './types'

const sechsTage: SkipassTyp = {
  id: 'p6',
  bezeichnung: '6 Tage Erwachsene',
  tage: 6,
  ekPreis: 260,
  vkPreis: 280,
  altersgruppen: ['erwachsener'],
}
const siebenTage: SkipassTyp = {
  id: 'p7',
  bezeichnung: '7 Tage Erwachsene',
  tage: 7,
  ekPreis: 295,
  vkPreis: 295,
  altersgruppen: ['erwachsener'],
}
const kinderpass: SkipassTyp = {
  id: 'pk',
  bezeichnung: '6 Tage Kinder',
  tage: 6,
  ekPreis: 130,
  vkPreis: 130,
  altersgruppen: ['kind'],
}
const ohnePreis: SkipassTyp = {
  id: 'p0',
  bezeichnung: '6 Tage Erwachsene (Preis fehlt)',
  tage: 6,
  ekPreis: 0,
  vkPreis: 0,
  altersgruppen: ['erwachsener'],
}

function person(ueber: Partial<Teilnehmer> = {}): Teilnehmer {
  return {
    id: `tn-${Math.random()}`,
    vorname: 'A',
    nachname: 'B',
    altersgruppe: 'erwachsener',
    mitglied: true,
    beitragsfrei: false,
    status: 'bestaetigt',
    zusatzposten: [],
    rabatt: 0,
    zahlungen: [],
    angemeldetAm: '2026-11-01',
    ...ueber,
  }
}

describe('berechneSkipassEmpfehlung', () => {
  it('empfiehlt je Altersgruppe den günstigsten Pass', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person(), person(), person({ altersgruppe: 'kind' })],
      skipassTypen: [siebenTage, sechsTage, kinderpass],
    })
    const erwachsene = e.gruppen.find((g) => g.altersgruppe === 'erwachsener')
    expect(erwachsene?.empfehlung?.id).toBe('p6')
    expect(erwachsene?.optionen[0].empfohlen).toBe(true)
    expect(e.gruppen.find((g) => g.altersgruppe === 'kind')?.empfehlung?.id).toBe('pk')
  })

  it('fasst die Bestellung je Passtyp zusammen', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person(), person(), person({ altersgruppe: 'kind' })],
      skipassTypen: [sechsTage, siebenTage, kinderpass],
    })
    expect(e.bestellung).toHaveLength(2)
    // Nach Einkaufswert sortiert: 2 × 260 vor 1 × 130
    expect(e.bestellung[0]).toMatchObject({ anzahl: 2, ekSumme: 520 })
    expect(e.bestellung[1]).toMatchObject({ anzahl: 1, ekSumme: 130 })
    expect(e.ekGesamt).toBe(650)
    expect(e.vkGesamt).toBe(690)
  })

  it('beziffert die Ersparnis gegenüber der teuersten Variante', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person(), person()],
      skipassTypen: [sechsTage, siebenTage],
    })
    expect(e.ekGesamt).toBe(520)
    expect(e.teuersteEk).toBe(590)
    expect(e.ersparnis).toBe(70)
    expect(e.gruppen[0].optionen[1].mehrkosten).toBe(70)
  })

  it('zählt Warteliste und Stornierungen nicht mit', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [
        person(),
        person({ status: 'warteliste' }),
        person({ status: 'storniert' }),
      ],
      skipassTypen: [sechsTage],
    })
    expect(e.bestellung[0].anzahl).toBe(1)
  })

  it('bestellt auch für beitragsfreie Teilnehmer – der Verein zahlt den Pass', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person(), person({ beitragsfrei: true })],
      skipassTypen: [sechsTage],
    })
    expect(e.bestellung[0].anzahl).toBe(2)
    expect(e.ekGesamt).toBe(520)
  })

  it('schließt Pässe ohne Einkaufspreis aus dem Vergleich aus', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person()],
      skipassTypen: [ohnePreis, sechsTage],
    })
    const gruppe = e.gruppen[0]
    expect(gruppe.optionen.map((o) => o.typ.id)).toEqual(['p6'])
    expect(gruppe.ohnePreis.map((t) => t.id)).toEqual(['p0'])
    expect(e.personenOhneOption).toBe(0)
  })

  it('meldet Personen, für die kein Pass mit Preis vorliegt', () => {
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person(), person({ altersgruppe: 'jugendlicher' })],
      skipassTypen: [sechsTage],
    })
    expect(e.personenOhneOption).toBe(1)
    expect(e.gruppen.find((g) => g.altersgruppe === 'jugendlicher')?.empfehlung)
      .toBeUndefined()
  })

  it('berücksichtigt Pässe ohne Altersbeschränkung für jede Gruppe', () => {
    const allgemein: SkipassTyp = { ...sechsTage, id: 'pa', altersgruppen: [] }
    const e = berechneSkipassEmpfehlung({
      teilnehmer: [person({ altersgruppe: 'jugendlicher' })],
      skipassTypen: [allgemein],
    })
    expect(e.gruppen[0].empfehlung?.id).toBe('pa')
  })

  it('markiert die aktuelle Zuordnung erst als vergleichbar, wenn sie vollständig ist', () => {
    const unvollstaendig = berechneSkipassEmpfehlung({
      teilnehmer: [person({ skipassTypId: 'p7' }), person()],
      skipassTypen: [sechsTage, siebenTage],
    })
    expect(unvollstaendig.aktuellVollstaendig).toBe(false)
    expect(unvollstaendig.aktuellEk).toBe(295)

    const vollstaendig = berechneSkipassEmpfehlung({
      teilnehmer: [person({ skipassTypId: 'p7' }), person({ skipassTypId: 'p7' })],
      skipassTypen: [sechsTage, siebenTage],
    })
    expect(vollstaendig.aktuellVollstaendig).toBe(true)
    expect(vollstaendig.aktuellEk).toBe(590)
  })

  it('bleibt ohne Teilnehmer und ohne Passtypen stabil', () => {
    const e = berechneSkipassEmpfehlung({ teilnehmer: [], skipassTypen: [] })
    expect(e.gruppen).toEqual([])
    expect(e.bestellung).toEqual([])
    expect(e.ekGesamt).toBe(0)
    expect(e.ersparnis).toBe(0)
    expect(e.aktuellVollstaendig).toBe(false)
  })
})
