import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import CookieBanner from './components/CookieBanner.jsx'
import DarkModeToggle from './components/DarkModeToggle.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Radiologist from './pages/Radiologist.jsx'
import Audit from './pages/Audit.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

function Header(){
  return (<header><div className="container"><h1>Radiology hub QIP</h1><p className="muted">OOH CT Vetting • Feedback • eLearning</p></div></header>)
}
function Tabs({ tab, setTab }){
  const items = [
    { id:'dashboard', label:'User Dashboard' },
    { id:'leaderboard', label:'Leaderboard' },
    { id:'radiologist', label:'Radiologist' },
    { id:'audit', label:'Audit' },
  ]
  return (
    <div className="row" style={{ marginBottom: 12 }}>
      {items.map(it=>(
        <button key={it.id} className={tab===it.id?'primary':''} onClick={()=>setTab(it.id)}>{it.label}</button>
      ))}
    </div>
  )
}
function App(){
  const [tab, setTab] = React.useState('dashboard')
  return (
    <>
      <Header />
      <main>
        <div className="container">
          <Tabs tab={tab} setTab={setTab} />
          {tab==='dashboard' && <Dashboard/>}
          {tab==='radiologist' && <Radiologist/>}
          {tab==='leaderboard' && <Leaderboard/>}
          {tab==='audit' && <Audit/>}
        </div>
      </main>
      <CookieBanner />
      <footer>
        <div className="container footer-row">
          <small>Built by Hashim Dogar</small>
          <DarkModeToggle />
        </div>
      </footer>
    </>
  )
}
createRoot(document.getElementById('root')).render(<App />)

console.log('VITE_API_URL =', import.meta.env.VITE_API_URL);
