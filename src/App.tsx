import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Anmeldungen } from './pages/Anmeldungen'
import { Ausgaben } from './pages/Ausgaben'
import { Einstellungen } from './pages/Einstellungen'
import { Kalkulation } from './pages/Kalkulation'
import { Preise } from './pages/Preise'
import { Skipaesse } from './pages/Skipaesse'
import { Uebersicht } from './pages/Uebersicht'
import { Zimmer } from './pages/Zimmer'

export function App() {
  return (
    // HashRouter, damit Tiefenlinks auf GitHub Pages ohne Server-Rewrite laufen.
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Uebersicht />} />
          <Route path="anmeldungen" element={<Anmeldungen />} />
          <Route path="zimmer" element={<Zimmer />} />
          <Route path="skipaesse" element={<Skipaesse />} />
          <Route path="preise" element={<Preise />} />
          <Route path="ausgaben" element={<Ausgaben />} />
          <Route path="kalkulation" element={<Kalkulation />} />
          <Route path="einstellungen" element={<Einstellungen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
