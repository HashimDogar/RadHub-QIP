import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import Radiologist from './pages/Radiologist.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Audit from './pages/Audit.jsx'
import './styles.css'
import CookieBanner from './components/CookieBanner.jsx'

function AppShell() {
  return (
    <BrowserRouter>
      <div className="container">
        <header>
          <h1>Radiology hub QIP</h1>
          <nav>
            <NavLink to="/dashboard">Requester Dashboard</NavLink>
            <NavLink to="/radiologist">Radiologist</NavLink>
            <NavLink to="/audit">Audit</NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/radiologist" element={<Radiologist />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/audit" element={<Audit />} />
          </Routes>
        </main>
        <CookieBanner />
        <footer>
          <small>Prototype for QI — stores no patient identifiers.</small>
        </footer>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<AppShell />)
