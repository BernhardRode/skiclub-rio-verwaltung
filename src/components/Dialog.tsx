import { useEffect, type ReactNode } from 'react'
import { Knopf } from './ui'

export function Dialog({
  offen,
  titel,
  breit = false,
  onSchliessen,
  fuss,
  children,
}: {
  offen: boolean
  titel: string
  breit?: boolean
  onSchliessen: () => void
  fuss?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    if (!offen) return
    const beiTaste = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSchliessen()
    }
    document.addEventListener('keydown', beiTaste)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', beiTaste)
      document.body.style.overflow = ''
    }
  }, [offen, onSchliessen])

  if (!offen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className={`w-full ${breit ? 'max-w-3xl' : 'max-w-xl'} rounded-xl bg-white shadow-xl`}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">{titel}</h2>
          <Knopf variante="still" onClick={onSchliessen} aria-label="Schließen">
            ✕
          </Knopf>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {fuss ? (
          <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
            {fuss}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
