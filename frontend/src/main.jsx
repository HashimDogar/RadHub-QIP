import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import CookieBanner from './components/CookieBanner.jsx'
import DarkModeToggle from './components/DarkModeToggle.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Radiologist from './pages/Radiologist.jsx'

function Header(){
  return (<header><div className="container"><h1>Radiology hub QIP</h1><p className="muted">OOH CT vetting • dashboards • eLearning</p></div></header>)
}

function App(){
  const [tab, setTab] = React.useState('dashboard')
  return (
    <>
      <Header />
      <main>
        <div className="container">
          <div className="row" style={{ marginBottom: 12 }}>
            <button className={tab==='dashboard'?'primary':''} onClick={()=>setTab('dashboard')}>User Dashboard</button>
            <button className={tab==='radiologist'?'primary':''} onClick={()=>setTab('radiologist')}>Radiologist</button>
          </div>
          {tab==='dashboard'? <Dashboard/> : <Radiologist/>}
        </div>
      </main>
      <CookieBanner />
      <footer>
        <div className="container footer-row">
          <small>© Radiology hub QIP</small>
          <DarkModeToggle />
        </div>
      </footer>
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
