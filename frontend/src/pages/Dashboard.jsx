import React, { useEffect, useRef, useState } from 'react'
import Modules from '../components/Modules'
import SummaryCard from '../components/SummaryCard'
import { getUser, updateUser, gmcLookup, getRank } from '../lib/api'

export default function Dashboard(){
  const [gmc, setGmc] = useState('')
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [recognised, setRecognised] = useState(null)
  const [busy, setBusy] = useState(false)

  const [signupName, setSignupName] = useState('')
  const [signupSpec, setSignupSpec] = useState('')
  const [signupGrade, setSignupGrade] = useState('')
  const [signupHosp, setSignupHosp] = useState('')

  const [rankMetric, setRankMetric] = useState('score')
  const [rankBy, setRankBy] = useState('hospital')
  const [rankValue, setRankValue] = useState('')
  const [rankData, setRankData] = useState(null)

  const isGmcValid = /^\d{7}$/.test(gmc)
  const debounceRef = useRef()

  async function fetchUser(){
    if (!isGmcValid){ setMsg('GMC must be 7 digits'); setRecognised(null); setData(null); return }
    setBusy(true)
    try{
      const res = await getUser(gmc.trim())
      if (res && !res.error){ setData(res); setMsg(''); setRecognised(true) }
      else { setData(null); setRecognised(false); setMsg(res?.error || 'User not recognised') }
    } finally { setBusy(false) }
  }

  // Auto lookup + fetch user on 7 digits
  useEffect(()=>{
    clearTimeout(debounceRef.current)
    if (isGmcValid){
      debounceRef.current = setTimeout(async ()=>{
        try{ const lk = await gmcLookup(gmc.trim()); if (lk?.name) setSignupName(lk.name) }catch{}
        await fetchUser()
      }, 250)
    } else {
      setRecognised(null); setData(null)
    }
    return () => clearTimeout(debounceRef.current)
  }, [gmc])

  async function createProfile(){
    if (!signupName || !signupSpec || !signupGrade || !signupHosp){ alert('Complete all fields'); return }
    setBusy(True)
    try{
      const r = await updateUser(gmc.trim(), { name: signupName, specialty: signupSpec, grade: signupGrade, hospital: signupHosp })
      if (r && r.ok){ await fetchUser() } else alert(r?.error||'Could not create profile')
    } finally { setBusy(false) }
  }

  const profileCard = recognised ? (
    <section className="card">
      <h3>Profile</h3>
      <div className="kpis">
        <div className="kpi"><div>GMC</div><strong>{data.user.gmc}</strong></div>
        <div className="kpi"><div>Name</div><strong>{data.user.name || '-'}</strong></div>
        <div className="kpi"><div>Hospital</div><strong>{data.user.hospital || '-'}</strong></div>
        <div className="kpi"><div>Specialty</div><strong>{data.user.specialty || '-'}</strong></div>
        <div className="kpi"><div>Grade</div><strong>{data.user.grade || '-'}</strong></div>
        <div className="kpi"><div>Score</div><strong>{data.user.score}</strong></div>
      </div>
    </section>
  ) : null

  const summaryCard = recognised ? (
    <SummaryCard stats={data.stats} score={data.user.score} showLegend />
  ) : null

  return (
    <div className="grid">
      <section className="card">
        <h2>Your dashboard</h2>
        <div className="row">
          <div style={{ minWidth: 240, flex: '1 1 240px' }}>
            <label>Enter your GMC</label>
            <input value={gmc} onChange={e=>setGmc(e.target.value.replace(/\D/g,'').slice(0,7))} onKeyDown={e=>{ if(e.key==='Enter'&&isGmcValid) fetchUser() }} placeholder="7-digit GMC" maxLength={7} inputMode="numeric" />
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" disabled={!isGmcValid||busy} onClick={fetchUser}>{busy?'Loading…':'View'}</button>
          </div>
        </div>
        {msg && <p className="error">{msg}</p>}
      </section>

      {profileCard}
      {summaryCard}
      <Modules visible={!!recognised} />

      {/* About moves to bottom once recognised */}
      <section className="card">
        <h3>About</h3>
        <p style={{ margin:0 }}>This tool supports safe out-of-hours CT vetting, provides personalised feedback, and offers eLearning based on iRefer guidance.</p>
      </section>

      {!recognised && isGmcValid && (
        <section className="card">
          <h2>User not recognised</h2>
          <div className="kpis" style={{ marginBottom:8 }}>
            <div className="kpi"><div>GMC</div><strong>{gmc}</strong></div>
            <div className="kpi"><div>Name (from GMC)</div><strong>{signupName || '-'}</strong></div>
          </div>
          <div className="row">
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Name</label><input value={signupName} onChange={e=>setSignupName(e.target.value)} placeholder="Auto from GMC (editable)" /></div>
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Specialty</label>
              <select value={signupSpec} onChange={e=>setSignupSpec(e.target.value)}>
                <option value="">Select specialty</option>
                {['Emergency Medicine','General (Internal) Medicine','General Surgery','Orthopaedic Surgery','Plastic Surgery','Neurosurgery','Urology','ENT (Otolaryngology)','Maxillofacial Surgery','Paediatrics','Obstetrics & Gynaecology','Intensive Care','Anaesthetics','Cardiology','Neurology','Oncology','Geriatrics','Other'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Grade</label>
              <select value={signupGrade} onChange={e=>setSignupGrade(e.target.value)}>
                <option value="">Select grade</option>
                {['FY1','FY2','CT1','CT2','CT3','IMT1','IMT2','IMT3','SHO','Registrar','ST4+','Consultant','Other'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Hospital</label>
              <select value={signupHosp} onChange={e=>setSignupHosp(e.target.value)}>
                <option value="">Select hospital</option>
                {['Whiston Hospital','Southport Hospital','Ormskirk Hospital'].map(h=><option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop:8 }}>
            <button className="primary" disabled={busy} onClick={createProfile}>{busy?'Saving…':'Create profile'}</button>
          </div>
        </section>
      )}
    </div>
  )
}