import { describe, expect, it } from 'vitest'
import { erstelleStartdaten, erstelleZimmerplan } from './defaults'

describe('Zimmerplan der Unterkunft', () => {
  it('enthält 24 Zimmer mit zusammen 56 Betten', () => {
    const zimmer = erstelleZimmerplan()
    expect(zimmer).toHaveLength(24)
    expect(zimmer.reduce((summe, z) => summe + z.betten, 0)).toBe(56)
  })

  it('vergibt eindeutige Bezeichnungen und IDs', () => {
    const zimmer = erstelleZimmerplan()
    expect(new Set(zimmer.map((z) => z.bezeichnung)).size).toBe(zimmer.length)
    expect(new Set(zimmer.map((z) => z.id)).size).toBe(zimmer.length)
  })

  it('leitet die Kategorie aus der Bettenzahl ab', () => {
    const zimmer = erstelleZimmerplan()
    const nach = (bezeichnung: string) =>
      zimmer.find((z) => z.bezeichnung === bezeichnung)
    expect(nach('MAZ')).toMatchObject({ betten: 1, kategorie: 'Einzelzimmer' })
    expect(nach('01')).toMatchObject({ betten: 2, kategorie: 'Doppelzimmer' })
    expect(nach('106')).toMatchObject({ betten: 5, kategorie: '5-Bett-Zimmer' })
  })

  it('ordnet die Zimmer den drei Bereichen der Unterkunft zu', () => {
    const zimmer = erstelleZimmerplan()
    const haus = (bezeichnung: string) =>
      zimmer.find((z) => z.bezeichnung === bezeichnung)?.haus
    expect(haus('106')).toBe('Haupthaus, 1. Obergeschoss')
    expect(haus('DL2')).toBe('Drei Länder Hotel (Nachbarhaus)')
    expect(haus('MAZ')).toBe('Mitarbeiterzimmer')
  })

  it('liefert alle Zimmer zunächst als verfügbar, das MAZ mit Hinweis', () => {
    const zimmer = erstelleZimmerplan()
    expect(zimmer.every((z) => z.verfuegbar)).toBe(true)
    const maz = zimmer.find((z) => z.bezeichnung === 'MAZ')
    expect(maz?.notiz).toMatch(/nicht jedes Jahr/)
  })

  it('startet ohne Zuschlag – Aufschläge werden pro Zimmer gepflegt', () => {
    expect(erstelleZimmerplan().every((z) => z.zuschlagProPerson === 0)).toBe(true)
  })

  it('erzeugt bei jedem Aufruf frische IDs', () => {
    expect(erstelleZimmerplan()[0].id).not.toBe(erstelleZimmerplan()[0].id)
  })
})

describe('erstelleStartdaten', () => {
  it('liefert den Zimmerplan direkt mit', () => {
    expect(erstelleStartdaten().zimmer).toHaveLength(24)
  })

  it('startet ohne Anmeldungen', () => {
    expect(erstelleStartdaten().teilnehmer).toEqual([])
  })
})
