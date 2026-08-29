/** Erzeugt eine für Excel/LibreOffice geeignete CSV (Semikolon, BOM). */
export function alsCsv(kopf: string[], zeilen: (string | number)[][]): string {
  const feld = (wert: string | number) => {
    const text = typeof wert === 'number' ? wert.toString().replace('.', ',') : wert
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [kopf, ...zeilen].map((zeile) => zeile.map(feld).join(';')).join('\r\n')
}

export function dateiHerunterladen(
  inhalt: string,
  dateiname: string,
  typ = 'text/csv;charset=utf-8',
): void {
  const bom = typ.startsWith('text/csv') ? '﻿' : ''
  const blob = new Blob([bom + inhalt], { type: typ })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
