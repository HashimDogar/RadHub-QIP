import React, { useEffect, useState } from 'react'
import { getUser, radUnlock, radSession, gmcLookup, vet, updateUser } from '../lib/api'
import PieChart from '../components/PieChart'

const GRADE_OPTIONS = ['FY1','FY2','CT1','CT2','CT3','IMT1','IMT2','IMT3','SHO','Registrar','ST4+','Consultant','Other']
const SPECIALTIES = ['Emergency Medicine','General (Internal) Medicine','General Surgery','Orthopaedic Surgery','Plastic Surgery','Neurosurgery','Urology','ENT (Otolaryngology)','Maxillofacial Surgery','Paediatrics','Obstetrics & Gynaecology','Intensive Care','Anaesthetics','Cardiology','Neurology','Oncology','Geriatrics','Other']
const HOSPITALS = ['Whiston Hospital','Southport Hospital','Ormskirk Hospital']

export default function Radiologist(){
  const [accessCode, setAccessCode] = useState('')
  const [codeOk, setCodeOk] = useState(false)
  const [unlockBusy, setUnlockBusy] = useState(false)

  const [gmc, setGmc] = useState('')
  const [radGmc, setRadGmc] = useState('')
  const [scanType, setScanType] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState('')
  const [reason, setReason] = useState('')
  const [seniorOk, setSeniorOk] = useState(false)
  const [reqAppropriateness, setReqAppropriateness] = useState(0)
  const [reqQuality, setReqQuality] = useState(0)

  const [snapshot, setSnapshot] = useState(null)
  const [showNewUserProfile, setShowNewUserProfile] = useState(false)
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newHospital, setNewHospital] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [saved, setSaved] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(()=>{ radSession().then(s=>{ if(s?.active) setCodeOk(true) }) },[])

  function isValidGmc(v){ return /^\d{7}$/.test((v||'').trim()) }
  function outcomesForScore(score){ const outs=['accepted','delayed','rejected']; if (typeof score==='number' && score<300) outs.push('override'); return outs }

  async function unlock(){
    setUnlockBusy(true)
    try{
      const r = await radUnlock(accessCode.trim())
      if (r?.ok) { setCodeOk(true); setMsg('') } else setMsg(r?.error||'Invalid code')
    } finally { setUnlockBusy(false) }
  }

  async function loadSnapshot(v){
    if (!isValidGmc(v)){ setSnapshot(null); setShowNewUserProfile(false); return }
    const res = await getUser(v.trim())
    if (res && !res.error){ setSnapshot(res); setShowNewUserProfile(false) }
    else { setSnapshot(null); setShowNewUserProfile(true); try{ const lk=await gmcLookup(v.trim()); setResolvedName(lk?.name||'') }catch{}; setNewSpecialty(''); setNewGrade(''); setNewHospital('') }
  }

  const needsSeniorTick = (snapshot?.user?.score < 300 && snapshot) && (selectedOutcome !== 'override')
  const canSave = isValidGmc(gmc) && isValidGmc(radGmc) && scanType && selectedOutcome && reqAppropriateness && reqQuality && (!needsSeniorTick || seniorOk) && (!showNewUserProfile || (newSpecialty && newGrade && newHospital))

  async function saveEpisode(){
    if (!canSave){ setMsg('Please complete mandatory fields'); return }
    const payload = { requester_gmc: gmc.trim(), radiologist_gmc: radGmc.trim(), scan_type: scanType, outcome: selectedOutcome, reason, discussed_with_senior: needsSeniorTick ? seniorOk : 0, request_quality: reqQuality, request_appropriateness: reqAppropriateness }
    if (showNewUserProfile){ payload.specialty = newSpecialty; payload.grade = newGrade; payload.hospital = newHospital; payload.name = resolvedName }
    const r = await vet(payload)
    if (!r || r.error){ setMsg(r?.error||'Save failed'); return }
    setSaved('Saved. Fields cleared.'); setTimeout(()=>setSaved(''),1500)
    // clear
    setGmc(''); setRadGmc(''); setScanType(''); setSelectedOutcome(''); setReason(''); setSeniorOk(false); setSnapshot(null); setShowNewUserProfile(false); setNewSpecialty(''); setNewGrade(''); setNewHospital(''); setResolvedName(''); setReqAppropriateness(0); setReqQuality(0)
  }

  async function createUserNow(){
    if (!showNewUserProfile) return
    if (!isValidGmc(gmc) || !newSpecialty || !newGrade || !newHospital){ setMsg('Complete GMC, specialty, grade, hospital'); return }
    const r = await updateUser(gmc.trim(), { name: resolvedName || undefined, specialty: newSpecialty, grade: newGrade, hospital: newHospital })
    if (r && r.ok){
      const res = await getUser(gmc.trim())
      if (res && !res.error){ setSnapshot(res); setShowNewUserProfile(false); setMsg('User created. You can now save requests normally.') }
    } else {
      setMsg(r?.error || 'Failed to create user')
    }
  }

  if (!codeOk){
    return (
      <section className="card">
        <h2>Radiologist access</h2>
        <label>Access code</label>
        <input value={accessCode} onChange={e=>setAccessCode(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') unlock() }} placeholder="Enter code (080299)" />
        <div className="actions"><button className="primary" disabled={unlockBusy} onClick={unlock}>{unlockBusy?'Unlocking…':'Unlock'}</button></div>
        {msg && <p className="error">{msg}</p>}
      </section>
    )
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Out-of-hours CT vetting</h2>
        <div className="row">
          <div style={{ minWidth: 240, flex:'1 1 240px' }}><label>Requester GMC (mandatory)</label>
            <input value={gmc} onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,7); setGmc(v); loadSnapshot(v) }} placeholder="7-digit GMC" maxLength={7} inputMode="numeric" />
          </div>
        </div>

        {snapshot && (
          <section className="card" style={{ marginTop: 12 }}>
            <h3>Requester snapshot</h3>
            <div className="kpis">
              <div className="kpi"><div>GMC</div><strong>{snapshot.user.gmc}</strong></div>
              <div className="kpi"><div>Name</div><strong>{snapshot.user.name || '-'}</strong></div>
              <div className="kpi"><div>Hospital</div><strong>{snapshot.user.hospital || '-'}</strong></div>
              <div className="kpi"><div>Specialty</div><strong>{snapshot.user.specialty || '-'}</strong></div>
              <div className="kpi"><div>Grade</div><strong>{snapshot.user.grade || '-'}</strong></div>
              <div className="kpi"><div>Score</div><strong>{snapshot.user.score}</strong></div>
              <div className="kpi"><div>Req quality</div><strong>{(snapshot.stats.avg_request_quality||0).toFixed(1)}</strong></div>
              <div className="kpi"><div>Req appropriateness</div><strong>{(snapshot.stats.avg_request_appropriateness||0).toFixed(1)}</strong></div>
            </div>
          </section>
        )}

        {snapshot && (()=>{
          const accepted = snapshot.stats.counts.accepted + snapshot.stats.counts.override
          const delayed = snapshot.stats.counts.delayed
          const rejected = snapshot.stats.counts.rejected
          const total = accepted + delayed + rejected
          return (
            <section className="card" style={{ marginTop: 12 }}>
              <h3>Summary</h3>
              <div className="row" style={{ alignItems:'center', gap:20 }}>
                <div style={{ flex:'0 0 auto' }}>
                  <PieChart data={[
                    { label:'Accepted', value: accepted },
                    { label:'Delayed', value: delayed },
                    { label:'Rejected', value: rejected },
                  ]} />
                </div>
                <div style={{ minWidth: 220 }}>
                  <div>Total requests: <strong>{total}</strong></div>
                  <div>Accepted requests: <strong>{accepted}</strong></div>
                  <div>Delayed requests: <strong>{delayed}</strong></div>
                  <div>Rejected requests: <strong>{rejected}</strong></div>
                  <div>Overrides: <strong>{snapshot.stats.counts.override}</strong></div>
                  <div>Total score: <strong>{snapshot.user.score}</strong></div>
                  <div>Request quality score: <strong>{(snapshot.stats.avg_request_quality||0).toFixed(1)}</strong></div>
                  <div>Request appropriateness score: <strong>{(snapshot.stats.avg_request_appropriateness||0).toFixed(1)}</strong></div>
                </div>
              </div>
            </section>
          )
        })()}

        {showNewUserProfile && (
          <div className="card" style={{ marginTop: 12, border:'1px dashed var(--border)' }}>
            <h3>New requester profile</h3>
            <div className="row">
              <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Name</label><input value={resolvedName} onChange={e=>setResolvedName(e.target.value)} placeholder="Auto from GMC (editable)" /></div>
              <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Specialty</label>
                <select value={newSpecialty} onChange={e=>setNewSpecialty(e.target.value)}><option value="">Select specialty</option>{SPECIALTIES.map(s=><option key={s}>{s}</option>)}</select>
              </div>
              <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Grade</label>
                <select value={newGrade} onChange={e=>setNewGrade(e.target.value)}><option value="">Select grade</option>{GRADE_OPTIONS.map(s=><option key={s}>{s}</option>)}</select>
              </div>
              <div style={{ minWidth: 220, flex:'1 1 220px' }}><label>Hospital</label>
                <select value={newHospital} onChange={e=>setNewHospital(e.target.value)}><option value="">Select hospital</option>{HOSPITALS.map(h=><option key={h}>{h}</option>)}</select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="primary" onClick={createUserNow}>Create user now</button>
              <span className="muted">or continue and they’ll be created on first save</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label>Scan type</label>
          <select value={scanType} onChange={e=>setScanType(e.target.value)}>
            <option value="">Select scan type</option>
            {['CT Head (trauma)','CT Head (non-trauma)','CT Abdomen/Pelvis','CT Pulmonary Angiogram','CT Spine','CT Angiogram (other)','CT KUB','Other'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Outcome</label>
          <div className="row">
            {outcomesForScore(snapshot?.user?.score).map(out=>(
              <button key={out}
                className={'chip ' + (selectedOutcome===out ? 'chip--active' : '')}
                style={{ cursor:'pointer' }}
                onClick={()=>setSelectedOutcome(out)}
                title={ out==='accepted' ? 'Do OOH' : out==='delayed' ? 'Do in-hours' : out==='rejected' ? 'Not indicated' : 'Urgent override (proceed without senior)' }
              >{out}</button>
            ))}
          </div>
        </div>

        {(snapshot?.user?.score < 300 && selectedOutcome !== 'override') && (
          <div style={{ marginTop: 12, padding: 10, background:'#fdf7e7', border:'1px solid #f2e1a6', borderRadius: 8 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={seniorOk} onChange={e=>setSeniorOk(e.target.checked)} />
              <span><strong>Requester score &lt; 300 —</strong> Have they discussed with senior? If not required, select <em>override</em>.</span>
            </label>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label>Reason (no patient identifiers)</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Justification. Do NOT include patient identifiers." rows={3} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Request appropriateness: Please rate how appropriate the indication was for this scan.</label>
          <div className="row" style={{ flexWrap:'wrap', gap:4 }}>
            {Array.from({length:10},(_,i)=>i+1).map(n=>(
              <label key={n} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <input type="radio" name="reqApp" value={n} checked={reqAppropriateness===n} onChange={()=>setReqAppropriateness(n)} />
                <span>{n}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Request quality: Please rate the quality of the clinical information provided.</label>
          <div className="row" style={{ flexWrap:'wrap', gap:4 }}>
            {Array.from({length:10},(_,i)=>i+1).map(n=>(
              <label key={n} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <input type="radio" name="reqQual" value={n} checked={reqQuality===n} onChange={()=>setReqQuality(n)} />
                <span>{n}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ minWidth: 240, flex:'1 1 240px' }}><label>Radiologist GMC (mandatory)</label>
            <input value={radGmc} onChange={e=>setRadGmc(e.target.value.replace(/\D/g,'').slice(0,7))} onKeyDown={e=>{ if(e.key==='Enter' && canSave) saveEpisode() }} placeholder="7-digit GMC" maxLength={7} inputMode="numeric" />
          </div>
        </div>

        <div className="actions" style={{ marginTop: 12 }}>
          <button className={canSave?'primary':''} disabled={!canSave} onClick={saveEpisode} title={canSave?'Save vetting':'Fill mandatory fields'}>Save</button>
          {saved && <span style={{ marginLeft: 12 }}>{saved}</span>}
        </div>
        {msg && <p className="error">{msg}</p>}
      </section>
    </div>
  )
}
