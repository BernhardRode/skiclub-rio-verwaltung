import { describe, expect, it } from 'vitest'
import { deuteTarif, leseTeilnehmerliste, teileName } from './listenImport'

// Aufbau wie in den gewachsenen Teilnehmerlisten des Vereins: eine Titelzeile,
// dann die Kopfzeile, Namen als „Nachname, Vorname“.
const beispielliste = `Teilnehmer 2025;;;;
;;;;
Nr;Name;Tarif;Zimmer;Essen
1;Busfahrer (extern);Kostenlos;107;
2;Muster, Erika;Mitglied;101;
3;Beispiel, Tim;Mitglied, Jugend;101;Vegetarisch
4;Probe, Lea;Nicht-Mitglied;102;Glutenfrei
5;Test, Jan;Mitglied Einzelzimmer;MAZ;
`

describe('teileName', () => {
  it('trennt „Nachname, Vorname“', () => {
    expect(teileName('Muster, Erika')).toEqual({ nachname: 'Muster', vorname: 'Erika' })
  })

  it('lässt Namen ohne Komma unangetastet', () => {
    expect(teileName('Busfahrer (extern)')).toEqual({
      nachname: '',
      vorname: 'Busfahrer (extern)',
    })
  })

  it('behält weitere Kommata im Vornamen', () => {
    expect(teileName('Muster-Beispiel, Erika, Dr.')).toEqual({
      nachname: 'Muster-Beispiel',
      vorname: 'Erika, Dr.',
    })
  })
})

describe('deuteTarif', () => {
  it('erkennt Mitglieder', () => {
    expect(deuteTarif('Mitglied')).toEqual({
      mitglied: true,
      altersgruppe: 'erwachsener',
      beitragsfrei: false,
    })
  })

  it('erkennt Nichtmitglieder trotz des enthaltenen Wortes „Mitglied“', () => {
    expect(deuteTarif('Nicht-Mitglied').mitglied).toBe(false)
  })

  it('erkennt die Jugendgruppe', () => {
    expect(deuteTarif('Mitglied, Jugend').altersgruppe).toBe('jugendlicher')
    expect(deuteTarif('Mitglied, Jugend').mitglied).toBe(true)
  })

  it('erkennt kostenlose Teilnahme', () => {
    expect(deuteTarif('Kostenlos').beitragsfrei).toBe(true)
  })

  it('behandelt Einzelzimmer als gewöhnliches Mitglied – der Zuschlag hängt am Zimmer', () => {
    expect(deuteTarif('Mitglied Einzelzimmer')).toEqual({
      mitglied: true,
      altersgruppe: 'erwachsener',
      beitragsfrei: false,
    })
  })

  it('fällt ohne Angabe auf erwachsenes Mitglied zurück', () => {
    expect(deuteTarif('')).toEqual({
      mitglied: true,
      altersgruppe: 'erwachsener',
      beitragsfrei: false,
    })
  })
})

describe('leseTeilnehmerliste', () => {
  it('überspringt die Titelzeile und liest alle Datenzeilen', () => {
    const ergebnis = leseTeilnehmerliste(beispielliste)
    expect(ergebnis.teilnehmer).toHaveLength(5)
    expect(ergebnis.teilnehmer[1]).toMatchObject({
      nachname: 'Muster',
      vorname: 'Erika',
      mitglied: true,
      altersgruppe: 'erwachsener',
      zimmerBezeichnung: '101',
    })
  })

  it('übernimmt Tarif, Zimmer und Essen', () => {
    const { teilnehmer } = leseTeilnehmerliste(beispielliste)
    expect(teilnehmer[0]).toMatchObject({
      vorname: 'Busfahrer (extern)',
      beitragsfrei: true,
      zimmerBezeichnung: '107',
    })
    expect(teilnehmer[2]).toMatchObject({
      altersgruppe: 'jugendlicher',
      verpflegung: 'Vegetarisch',
    })
    expect(teilnehmer[3]).toMatchObject({ mitglied: false, verpflegung: 'Glutenfrei' })
  })

  it('meldet Zimmer, die noch nicht angelegt sind', () => {
    const ergebnis = leseTeilnehmerliste(beispielliste, ['101'])
    expect(ergebnis.neueZimmer).toEqual(['102', '107', 'MAZ'])
  })

  it('kommt mit Komma als Trennzeichen und Anführungszeichen zurecht', () => {
    const ergebnis = leseTeilnehmerliste(
      'Name,Tarif,Zimmer\n"Muster, Erika",Mitglied,101\n',
    )
    expect(ergebnis.teilnehmer[0]).toMatchObject({
      nachname: 'Muster',
      vorname: 'Erika',
      zimmerBezeichnung: '101',
    })
  })

  it('kommt mit getrennten Spalten für Vor- und Nachname zurecht', () => {
    const ergebnis = leseTeilnehmerliste('Vorname;Nachname;E-Mail\nErika;Muster;e@x.de\n')
    expect(ergebnis.teilnehmer[0]).toMatchObject({
      vorname: 'Erika',
      nachname: 'Muster',
      email: 'e@x.de',
    })
  })

  it('warnt, wenn Tarif- oder Zimmerspalte fehlen', () => {
    const ergebnis = leseTeilnehmerliste('Name\nMuster, Erika\n')
    expect(ergebnis.warnungen).toHaveLength(2)
  })

  it('meldet eine fehlende Kopfzeile', () => {
    expect(() => leseTeilnehmerliste('a;b;c\n1;2;3\n')).toThrow(/Kopfzeile/)
  })

  it('meldet eine Liste ohne Datenzeilen', () => {
    expect(() => leseTeilnehmerliste('Name;Tarif\n')).toThrow(/Datenzeilen/)
  })

  it('meldet eine leere Datei', () => {
    expect(() => leseTeilnehmerliste('   ')).toThrow(/leer/)
  })
})
