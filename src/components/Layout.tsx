import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useDaten } from '../store/useAusfahrt'
import { datum } from '../lib/format'

const navigation = [
  { pfad: '/', label: 'Übersicht', symbol: '🏔️', exakt: true },
  { pfad: '/anmeldungen', label: 'Anmeldungen', symbol: '📝' },
  { pfad: '/zimmer', label: 'Zimmer', symbol: '🛏️' },
  { pfad: '/skipaesse', label: 'Skipässe', symbol: '🎟️' },
  { pfad: '/preise', label: 'Preise', symbol: '💶' },
  { pfad: '/ausgaben', label: 'Ausgaben', symbol: '🧾' },
  { pfad: '/kalkulation', label: 'Kalkulation', symbol: '⚖️' },
  { pfad: '/einstellungen', label: 'Einstellungen', symbol: '⚙️' },
]

export function Layout() {
  const { ausfahrt } = useDaten()
  const [menueOffen, setMenueOffen] = useState(false)

  const linkKlassen = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-alpen-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  const menue = (
    <nav className="space-y-1">
      {navigation.map((eintrag) => (
        <NavLink
          key={eintrag.pfad}
          to={eintrag.pfad}
          end={eintrag.exakt}
          className={linkKlassen}
          onClick={() => setMenueOffen(false)}
        >
          <span aria-hidden>{eintrag.symbol}</span>
          {eintrag.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block kein-druck">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="text-xs font-semibold tracking-widest text-alpen-600 uppercase">
              Skiclub Rio
            </div>
            <div className="mt-1 text-lg leading-tight font-semibold text-slate-900">
              Galtür {ausfahrt.jahr}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {datum(ausfahrt.anreise)} – {datum(ausfahrt.abreise)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">{menue}</div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            Daten liegen lokal im Browser.
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden kein-druck">
        <div>
          <div className="text-xs font-semibold tracking-widest text-alpen-600 uppercase">
            Skiclub Rio
          </div>
          <div className="text-sm font-semibold text-slate-900">
            Galtür {ausfahrt.jahr}
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          aria-expanded={menueOffen}
          onClick={() => setMenueOffen((offen) => !offen)}
        >
          {menueOffen ? '✕' : '☰'} Menü
        </button>
      </header>
      {menueOffen ? (
        <div className="border-b border-slate-200 bg-white p-3 lg:hidden kein-druck">
          {menue}
        </div>
      ) : null}

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
