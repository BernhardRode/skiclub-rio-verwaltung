const euroFormat = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

const zahlFormat = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
})

const datumFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const datumLangFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function euro(betrag: number): string {
  return euroFormat.format(Number.isFinite(betrag) ? betrag : 0)
}

export function zahl(wert: number): string {
  return zahlFormat.format(Number.isFinite(wert) ? wert : 0)
}

export function datum(iso?: string): string {
  if (!iso) return '–'
  const wert = Date.parse(iso)
  if (Number.isNaN(wert)) return '–'
  return datumFormat.format(wert)
}

export function datumLang(iso?: string): string {
  if (!iso) return '–'
  const wert = Date.parse(iso)
  if (Number.isNaN(wert)) return '–'
  return datumLangFormat.format(wert)
}

export function heute(): string {
  return new Date().toISOString().slice(0, 10)
}

/** „1 Person“ statt „1 Personen“. */
export function plural(anzahl: number, einzahl: string, mehrzahl: string): string {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`
}
