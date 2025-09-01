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

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [editHosp, setEditHosp] = useState('')

  const [rankings, setRankings] = useState({})

  const isGmcValid = /^\d{7}$/.test(gmc)
  const debounceRef = useRef()

  async function fetchUser(){
    if (!isGmcValid){ setMsg('GMC must be 7 digits'); setRecognised(null); setData(null); return }
    setBusy(true)
    try{
      const res = await getUser(gmc.trim())
      if (res && !res.error){
        setData(res)
        setMsg('')
        setRecognised(true)
        const u = res.user || {}
        const [rHosp, rDept] = await Promise.all([
          u.hospital ? getRank('score', { hospital: u.hospital, gmc: u.gmc }) : null,
          (u.hospital && u.specialty) ? getRank('score', { hospital: u.hospital, specialty: u.specialty, gmc: u.gmc }) : null
        ])
        setRankings({
          hospital: rHosp && rHosp.rank_index >= 0 ? { rank: rHosp.rank_index + 1, total: rHosp.total } : null,
          department: rDept && rDept.rank_index >= 0 ? { rank: rDept.rank_index + 1, total: rDept.total } : null
        })
      } else {
        setData(null)
        setRecognised(false)
        setMsg(res?.error || 'User not recognised')
        setRankings({})
      }
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
      setRecognised(null); setData(null); setRankings({})
    }
    return () => clearTimeout(debounceRef.current)
  }, [gmc])

  async function createProfile(){
    if (!signupName || !signupSpec || !signupGrade || !signupHosp){ alert('Complete all fields'); return }
    setBusy(true)
    try{
      const r = await updateUser(gmc.trim(), { name: signupName, specialty: signupSpec, grade: signupGrade, hospital: signupHosp })
      if (r && r.ok){ await fetchUser() } else alert(r?.error||'Could not create profile')
    } finally { setBusy(false) }
  }

  function startEdit(){
    setEditName(data?.user?.name || '')
    setEditSpec(data?.user?.specialty || '')
    setEditGrade(data?.user?.grade || '')
    setEditHosp(data?.user?.hospital || '')
    setEditing(true)
  }

  async function saveProfile(){
    if (!editName || !editSpec || !editGrade || !editHosp){ alert('Complete all fields'); return }
    setBusy(true)
    try{
      const r = await updateUser(gmc.trim(), { name: editName, specialty: editSpec, grade: editGrade, hospital: editHosp })
      if (r && r.ok){ await fetchUser(); setEditing(false) } else alert(r?.error||'Could not update profile')
    } finally { setBusy(false) }
  }

  const profileCard = recognised ? (
    <section className="card">
      <h3>Profile</h3>
      {!editing ? (
        <>
          <div className="kpis">
            <div className="kpi"><div>GMC</div><strong>{data.user.gmc}</strong></div>
            <div className="kpi"><div>Name</div><strong>{data.user.name || '-'}</strong></div>
            <div className="kpi"><div>Hospital</div><strong>{data.user.hospital || '-'}</strong></div>
            <div className="kpi"><div>Specialty</div><strong>{data.user.specialty || '-'}</strong></div>
            <div className="kpi"><div>Grade</div><strong>{data.user.grade || '-'}</strong></div>

          </div>
          <div className="actions" style={{ marginTop:8 }}>
            <button onClick={startEdit}>Edit details</button>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Name</label><input value={editName} onChange={e=>setEditName(e.target.value)} /></div>
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Specialty</label>
              <select value={editSpec} onChange={e=>setEditSpec(e.target.value)}>
                <option value="">Select specialty</option>
                {['Emergency Medicine','General (Internal) Medicine','General Surgery','Orthopaedic Surgery','Plastic Surgery','Neurosurgery','Urology','ENT (Otolaryngology)','Maxillofacial Surgery','Paediatrics','Obstetrics & Gynaecology','Intensive Care','Anaesthetics','Cardiology','Neurology','Oncology','Geriatrics','Other'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Grade</label>
              <select value={editGrade} onChange={e=>setEditGrade(e.target.value)}>
                <option value="">Select grade</option>
                {['FY1','FY2','CT1','CT2','CT3','IMT1','IMT2','IMT3','SHO','Registrar','ST4+','Consultant','Other'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Hospital</label>
              <select value={editHosp} onChange={e=>setEditHosp(e.target.value)}>
                <option value="">Select hospital</option>
                {['Whiston Hospital','Southport Hospital','Ormskirk Hospital'].map(h=><option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop:8 }}>
            <button onClick={()=>setEditing(false)} disabled={busy}>Cancel</button>
            <button className="primary" onClick={saveProfile} disabled={busy}>{busy?'Saving…':'Save'}</button>
          </div>
        </>
      )}
    </section>
  ) : null

  const summaryCard = recognised ? (
    <SummaryCard stats={data.stats} score={data.user.score} requests={data.requests} showLegend rankings={rankings} />
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
        <p style={{ margin:0 }}>This tool supports safe out-of-hours CT vetting, provides personalised feedback, and offers eLearning to improve our OOH requests.</p>
        <p></p>
        <p></p>
        <p style={{ margin:0 }}>For each request, you will be provided with personalised feedback by the radiologist which can be seen on your dashboard by typing in your GMC number. For every request, you will also generate three scores:</p>
        <p></p>
        <ul>
          <li><p style={{ margin:0 }}>
            <b>Clinical Information score:</b> A score of 1-10 where the radiologist will rate the quality of clinical information you provided for the requested scan.
            </p></li>
          <li><p style={{ margin:0 }}>
            <b>Clinical Indication score:</b> A score 1-10 where the radiologist will rate the appropriateness of the scan for your clinical situation.
            </p></li>
          <li><p style={{ margin: 0 }}>
            <b>Requestor points:</b> Your starting score is 500. 
            Accepted = <span style={{ fontWeight: "bold", color: "green" }}>+1</span>, 
            Rejected = <span style={{ fontWeight: "bold", color: "red" }}>-10</span>, 
            Delayed = <span style={{ fontWeight: "bold", color: "orange" }}>-5</span>.
          </p></li>
        </ul>
        <p></p>

  <p style={{ margin: 0 }}>
    These three scores will be combined to calculate an <b>Overall rating</b>. You can then see how you compare to your peers on the <b>Leaderboard</b> section.
  </p>
  <p></p>
  <p style = {{ margin: 0}}>
    The score given by each radiologist will be normalised via 'Within rater Normalisation'. This increased inter-rater comparibility of scores, and prevents your score being adversely affected by radiologist who tend to score more harshly.
  </p>
  <p></p>
  <h3>eLearning</h3>
  <p style = {{ margin: 0}}>
    By completing eLearning, you can increase your requestor score, which will in turn increase your overall score and ranking on the leaderboards.
  </p>
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