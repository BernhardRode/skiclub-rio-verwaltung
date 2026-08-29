import type { Altersgruppe, Teilnehmer } from '../domain/types'

export type ImportTeilnehmer = Omit<Teilnehmer, 'id' | 'angemeldetAm' | 'zimmerId'> & {
  /** Zimmerbezeichnung aus der Liste – wird beim Übernehmen aufgelöst. */
  zimmerBezeichnung?: string
}

export interface ImportErgebnis {
  teilnehmer: ImportTeilnehmer[]
  /** Zimmer, die in der Liste vorkommen, aber noch nicht angelegt sind. */
  neueZimmer: string[]
  warnungen: string[]
}

/** Zerlegt eine CSV-Zeile unter Beachtung von Anführungszeichen. */
function zerlegeZeile(zeile: string, trenner: string): string[] {
  const felder: string[] = []
  let aktuell = ''
  let inAnfuehrung = false

  for (let i = 0; i < zeile.length; i++) {
    const zeichen = zeile[i]
    if (inAnfuehrung) {
      if (zeichen === '"') {
        if (zeile[i + 1] === '"') {
          aktuell += '"'
          i++
        } else {
          inAnfuehrung = false
        }
      } else {
        aktuell += zeichen
      }
    } else if (zeichen === '"') {
      inAnfuehrung = true
    } else if (zeichen === trenner) {
      felder.push(aktuell)
      aktuell = ''
    } else {
      aktuell += zeichen
    }
  }
  felder.push(aktuell)
  return felder.map((feld) => feld.trim())
}

/** Häufigstes Trennzeichen der Kopfzeile gewinnt. */
function erkenneTrenner(zeilen: string[]): string {
  const kandidaten = [';', '\t', ',']
  let bester = ';'
  let meiste = 0
  for (const kandidat of kandidaten) {
    const anzahl = zeilen
      .slice(0, 5)
      .reduce((summe, zeile) => summe + zeile.split(kandidat).length - 1, 0)
    if (anzahl > meiste) {
      meiste = anzahl
      bester = kandidat
    }
  }
  return bester
}

function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss')
    .replace(/[^a-z]/g, '')
}

const SPALTEN_ALIASE: Record<string, string[]> = {
  name: ['name', 'teilnehmer', 'person'],
  vorname: ['vorname'],
  nachname: ['nachname', 'familienname'],
  tarif: ['tarif', 'status', 'mitgliedschaft', 'kategorie'],
  zimmer: ['zimmer', 'zimmernr', 'zimmernummer', 'raum'],
  verpflegung: ['essen', 'verpflegung', 'unvertraglichkeit', 'allergie', 'diat'],
  email: ['email', 'mail', 'emailadresse'],
  telefon: ['telefon', 'tel', 'handy', 'mobil'],
  geburtsdatum: ['geburtsdatum', 'geburtstag', 'gebdatum'],
}

function ordneSpalten(kopf: string[]): Record<string, number> {
  const zuordnung: Record<string, number> = {}
  kopf.forEach((zelle, index) => {
    const normalisiert = normalisiere(zelle)
    if (!normalisiert) return
    for (const [feld, aliase] of Object.entries(SPALTEN_ALIASE)) {
      if (feld in zuordnung) continue
      if (aliase.includes(normalisiert)) zuordnung[feld] = index
    }
  })
  return zuordnung
}

/** Bewertet, wie viele bekannte Spalten eine Zeile als Kopfzeile liefern würde. */
function bewerteKopfzeile(felder: string[]): number {
  const treffer = ordneSpalten(felder)
  const hatNamen = 'name' in treffer || 'nachname' in treffer || 'vorname' in treffer
  return hatNamen ? Object.keys(treffer).length : 0
}

function findeKopfzeile(zeilen: string[], trenner: string): number {
  let besterIndex = -1
  let bestePunkte = 0
  // Kopfzeilen stehen am Anfang; ein paar Titelzeilen davor sind üblich.
  for (let i = 0; i < Math.min(zeilen.length, 10); i++) {
    const punkte = bewerteKopfzeile(zerlegeZeile(zeilen[i], trenner))
    if (punkte > bestePunkte) {
      bestePunkte = punkte
      besterIndex = i
    }
  }
  return besterIndex
}

export interface TarifDeutung {
  mitglied: boolean
  altersgruppe: Altersgruppe
  beitragsfrei: boolean
}

/**
 * Deutet Tarifangaben wie „Mitglied, Jugend“, „Nicht-Mitglied“ oder
 * „Kostenlos“ aus gewachsenen Teilnehmerlisten.
 */
export function deuteTarif(tarif: string): TarifDeutung {
  const text = tarif.toLowerCase()
  const beitragsfrei = /kostenlos|gratis|frei\b|umsonst/.test(text)
  // „Nicht-Mitglied“ enthält ebenfalls „Mitglied“ – deshalb zuerst prüfen.
  const gast = /nicht|gast|extern/.test(text)
  const altersgruppe: Altersgruppe = /kleinkind/.test(text)
    ? 'kleinkind'
    : /jugend/.test(text)
      ? 'jugendlicher'
      : /kind/.test(text)
        ? 'kind'
        : 'erwachsener'
  return { mitglied: !gast, altersgruppe, beitragsfrei }
}

/** Trennt „Nachname, Vorname“; ohne Komma bleibt alles im Vornamen stehen. */
export function teileName(name: string): { vorname: string; nachname: string } {
  const komma = name.indexOf(',')
  if (komma === -1) return { vorname: name.trim(), nachname: '' }
  return {
    nachname: name.slice(0, komma).trim(),
    vorname: name.slice(komma + 1).trim(),
  }
}

/**
 * Liest eine Teilnehmerliste aus CSV. Erwartet eine Kopfzeile; eine
 * vorangestellte Titelzeile wird übersprungen.
 */
export function leseTeilnehmerliste(
  inhalt: string,
  bekannteZimmer: string[] = [],
): ImportErgebnis {
  const warnungen: string[] = []
  const zeilen = inhalt
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((zeile) => zeile.trim() !== '')

  if (zeilen.length === 0) {
    throw new Error('Die Datei ist leer.')
  }

  const trenner = erkenneTrenner(zeilen)

  // Die Kopfzeile ist die Zeile mit den meisten erkannten Spalten. Über die
  // Trefferzahl zu gehen statt über den ersten Treffer verhindert, dass eine
  // Titelzeile wie „Teilnehmer 2025“ fälschlich als Kopfzeile gilt.
  const kopfIndex = findeKopfzeile(zeilen, trenner)
  if (kopfIndex === -1) {
    throw new Error(
      'Keine Kopfzeile gefunden. Es wird eine Spalte „Name“ oder „Nachname“ benötigt.',
    )
  }

  const spalten = ordneSpalten(zerlegeZeile(zeilen[kopfIndex], trenner))
  const hatNamen = 'name' in spalten || 'nachname' in spalten || 'vorname' in spalten
  if (!hatNamen) {
    throw new Error('In der Kopfzeile fehlt eine Namensspalte.')
  }

  const lies = (felder: string[], schluessel: string): string =>
    schluessel in spalten ? (felder[spalten[schluessel]] ?? '') : ''

  const teilnehmer: ImportTeilnehmer[] = []
  const zimmerGesehen = new Set<string>()
  const bekannt = new Set(bekannteZimmer.map((z) => z.toLowerCase()))

  for (let i = kopfIndex + 1; i < zeilen.length; i++) {
    const felder = zerlegeZeile(zeilen[i], trenner)

    let vorname = lies(felder, 'vorname')
    let nachname = lies(felder, 'nachname')
    if (!vorname && !nachname) {
      const geteilt = teileName(lies(felder, 'name'))
      vorname = geteilt.vorname
      nachname = geteilt.nachname
    }
    if (!vorname && !nachname) continue

    const tarif = deuteTarif(lies(felder, 'tarif'))
    const zimmerBezeichnung = lies(felder, 'zimmer')
    if (zimmerBezeichnung) zimmerGesehen.add(zimmerBezeichnung)

    teilnehmer.push({
      vorname,
      nachname,
      email: lies(felder, 'email') || undefined,
      telefon: lies(felder, 'telefon') || undefined,
      geburtsdatum: lies(felder, 'geburtsdatum') || undefined,
      altersgruppe: tarif.altersgruppe,
      mitglied: tarif.mitglied,
      beitragsfrei: tarif.beitragsfrei,
      status: 'angemeldet',
      verpflegung: lies(felder, 'verpflegung') || undefined,
      skipassTypId: undefined,
      zusatzposten: [],
      rabatt: 0,
      zahlungen: [],
      zimmerBezeichnung: zimmerBezeichnung || undefined,
    })
  }

  if (teilnehmer.length === 0) {
    throw new Error('Es wurden keine Datenzeilen gefunden.')
  }
  if (!('tarif' in spalten)) {
    warnungen.push(
      'Keine Tarifspalte gefunden – alle Personen wurden als erwachsene Mitglieder übernommen.',
    )
  }
  if (!('zimmer' in spalten)) {
    warnungen.push('Keine Zimmerspalte gefunden – die Zuordnung bleibt offen.')
  }

  const neueZimmer = [...zimmerGesehen]
    .filter((bezeichnung) => !bekannt.has(bezeichnung.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))

  return { teilnehmer, neueZimmer, warnungen }
}
