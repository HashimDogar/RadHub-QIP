import React, { useEffect, useState } from 'react'
import { getUser, radUnlock, radSession, gmcLookup, vet, updateUser, getRadHistory, radLogout, getRank } from '../lib/api'
import SummaryCard from '../components/SummaryCard'

const GRADE_OPTIONS = ['FY1','FY2','CT1','CT2','CT3','IMT1','IMT2','IMT3','SHO','Registrar','ST4+','Consultant','Other']
const SPECIALTIES = ['Emergency Medicine','General (Internal) Medicine','General Surgery','Orthopaedic Surgery','Plastic Surgery','Neurosurgery','Urology','ENT (Otolaryngology)','Maxillofacial Surgery','Paediatrics','Obstetrics & Gynaecology','Intensive Care','Anaesthetics','Cardiology','Neurology','Oncology','Geriatrics','Other']
const HOSPITALS = ['Whiston Hospital','Southport Hospital','Ormskirk Hospital']

export default function Radiologist(){
  const [accessCode, setAccessCode] = useState('')
  const [codeOk, setCodeOk] = useState(false)
  const [unlockBusy, setUnlockBusy] = useState(false)

  const [gmc, setGmc] = useState('')
  const [radGmc, setRadGmc] = useState('')
  const [radName, setRadName] = useState('')
  const [scanType, setScanType] = useState('')
  const [otherScanType, setOtherScanType] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState('')
  const [reason, setReason] = useState('')
  const [reqAppropriateness, setReqAppropriateness] = useState(0)
  const [reqQuality, setReqQuality] = useState(0)

  const [snapshot, setSnapshot] = useState(null)
  const [snapshotRankings, setSnapshotRankings] = useState({})
  const [showNewUserProfile, setShowNewUserProfile] = useState(false)
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newHospital, setNewHospital] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [saved, setSaved] = useState('')
  const [msg, setMsg] = useState('')

  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(()=>{ radSession().then(async s=>{ if(s?.active){ setCodeOk(true); if(s.gmc){ setRadGmc(s.gmc); if(s.name) setRadName(s.name); else { try{ const lk=await gmcLookup(s.gmc); setRadName(lk?.name||'') }catch{} } } } }) },[])

  function parseDate(dateString){
    if(!dateString) return null
    const parsed = new Date(dateString.replace(' ', 'T') + 'Z')
    return isNaN(parsed.getTime()) ? null : parsed
  }

  function formatDate(dateString){
    const parsed = parseDate(dateString)
    return parsed ? parsed.toLocaleDateString() : '-'
  }

  function formatTime(dateString){
    const parsed = parseDate(dateString)
    return parsed ? parsed.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '-'
  }

  function formatOutcome(outcome){
    switch(outcome){
      case 'accepted': return 'Accepted'
      case 'rejected': return 'Rejected'
      case 'delayed': return 'Delayed'
      case 'info_needed': return 'More info'
      default: return outcome ? outcome.charAt(0).toUpperCase()+outcome.slice(1) : '-'
    }
  }

  function outcomeClass(outcome){
    switch(outcome){
      case 'accepted':
      case 'rejected':
      case 'delayed':
      case 'info_needed':
        return `outcome-${outcome}`
      default:
        return ''
    }
  }

  function isValidGmc(v){ return /^\d{7}$/.test((v||'').trim()) }
  const OUTCOME_OPTIONS = [
    { label:'Accept', value:'accepted' },
    { label:'Delayed', value:'delayed' },
    { label:'Reject', value:'rejected' },
    { label:'Requires further information', value:'info_needed' }
  ]

  async function unlock(){
    if (!isValidGmc(radGmc)){ setMsg('Enter valid GMC'); return }
    setUnlockBusy(true)
    try{
      const r = await radUnlock(accessCode.trim(), radGmc.trim())
      if (r?.ok) {
        setCodeOk(true)
        setMsg('')
        if(r.gmc) setRadGmc(r.gmc)
        if(r.name) setRadName(r.name)
        else {
          try{ const lk=await gmcLookup(radGmc.trim()); setRadName(lk?.name||'') }catch{}
        }
      } else setMsg(r?.error||'Invalid code')
    } finally { setUnlockBusy(false) }
  }

  async function loadSnapshot(v){
    if (!isValidGmc(v)){
      setSnapshot(null)
      setShowNewUserProfile(false)
      setSnapshotRankings({})
      return
    }
    const res = await getUser(v.trim())
    if (res && !res.error){
      setSnapshot(res)
      setShowNewUserProfile(false)
      const u = res.user || {}
      const [rHosp, rSpec] = await Promise.all([
        u.hospital ? getRank('score', { hospital: u.hospital, gmc: u.gmc }) : null,
        u.specialty ? getRank('score', { specialty: u.specialty, gmc: u.gmc }) : null
      ])
      setSnapshotRankings({
        hospital: rHosp && rHosp.rank_index >= 0 ? { rank: rHosp.rank_index + 1, total: rHosp.total } : null,
        specialty: rSpec && rSpec.rank_index >= 0 ? { rank: rSpec.rank_index + 1, total: rSpec.total } : null
      })
    }
    else {
      setSnapshot(null)
      setShowNewUserProfile(true)
      setSnapshotRankings({})
      try{ const lk=await gmcLookup(v.trim()); setResolvedName(lk?.name||'') }catch{}
      setNewSpecialty(''); setNewGrade(''); setNewHospital('')
    }
  }

  const canSave = isValidGmc(gmc) && isValidGmc(radGmc) && scanType && (scanType !== 'Other' || otherScanType.trim()) && selectedOutcome && reqAppropriateness && reqQuality && (!showNewUserProfile || (newSpecialty && newGrade && newHospital))

  async function saveEpisode(){
    if (!canSave){ setMsg('Please complete mandatory fields'); return }
    const payload = { requester_gmc: gmc.trim(), radiologist_gmc: radGmc.trim(), scan_type: scanType==='Other'?otherScanType.trim():scanType, outcome: selectedOutcome, reason, discussed_with_senior: 0, request_quality: reqQuality, request_appropriateness: reqAppropriateness }
    if (showNewUserProfile){ payload.specialty = newSpecialty; payload.grade = newGrade; payload.hospital = newHospital; payload.name = resolvedName }
    const r = await vet(payload)
    if (!r || r.error){ setMsg(r?.error||'Save failed'); return }
    setSaved('Saved. Fields cleared.'); setTimeout(()=>setSaved(''),1500)
    // clear
    setGmc(''); setScanType(''); setOtherScanType(''); setSelectedOutcome(''); setReason(''); setSnapshot(null); setSnapshotRankings({}); setShowNewUserProfile(false); setNewSpecialty(''); setNewGrade(''); setNewHospital(''); setResolvedName(''); setReqAppropriateness(0); setReqQuality(0)
    if (showHistory){
      const h = await getRadHistory()
      if (h && !h.error) setHistory(h.history || [])
    }
  }

  async function createUserNow(){
    if (!showNewUserProfile) return
    if (!isValidGmc(gmc) || !newSpecialty || !newGrade || !newHospital){ setMsg('Complete GMC, specialty, grade, hospital'); return }
    const r = await updateUser(gmc.trim(), { name: resolvedName || undefined, specialty: newSpecialty, grade: newGrade, hospital: newHospital })
    if (r && r.ok){
      await loadSnapshot(gmc.trim())
      setShowNewUserProfile(false)
      setMsg('User created. You can now save requests normally.')
    } else {
      setMsg(r?.error || 'Failed to create user')
    }
  }

  async function toggleHistory(){
    if (!showHistory){
      const res = await getRadHistory()
      if (res && !res.error) setHistory(res.history || [])
    }
    setShowHistory(!showHistory)
  }

  async function changeUser(){
    await radLogout()
    setAccessCode('')
    setCodeOk(false)
    setRadGmc('')
    setRadName('')
    setHistory([])
    setShowHistory(false)
    setGmc('')
    setSnapshot(null)
    setSnapshotRankings({})
  }

  if (!codeOk){
    return (
      <section className="card">
        <h2>Radiologist access</h2>
        <label>GMC number</label>
        <input value={radGmc} onChange={e=>setRadGmc(e.target.value.replace(/\D/g,'').slice(0,7))} onKeyDown={e=>{ if(e.key==='Enter') unlock() }} placeholder="7-digit GMC" maxLength={7} inputMode="numeric" />
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
        <h3>{radName || '-'}</h3>
        <div style={{color: "#4b5563"}}>Radiologist</div>
        <div className="row" style={{ marginTop: 8 }}>
          <button onClick={toggleHistory}>{showHistory ? 'Hide vetting history' : 'Show Vetting history'}</button>
          <button onClick={changeUser}>Change User</button>
        </div>
        {showHistory && (
          <table className="table vetting-history" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'center' }}>Date</th>
                <th style={{ textAlign:'center' }}>Time</th>
                <th style={{ textAlign:'center' }}>GMC</th>
                <th>Requester Name</th>
                <th>Scan type</th>
                <th>Outcome</th>
                <th style={{ textAlign:'center' }}>Clinical info score</th>
                <th style={{ textAlign:'center' }}>Indication score</th>
                <th style={{ textAlign:'center' }}>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h,i)=>(
                <tr key={i} className={outcomeClass(h.outcome)}>
                  <td>{formatDate(h.created_at)}</td>
                  <td style={{ textAlign:'center' }}>{formatTime(h.created_at)}</td>
                  <td style={{ textAlign:'center' }}>{h.requester_gmc}</td>
                  <td>{h.requester_name || '-'}</td>
                  <td>{h.scan_type}</td>
                  <td style={{ textAlign:'center' }}>{formatOutcome(h.outcome)}</td>
                  <td style={{ textAlign:'center' }}>{h.clinical_information_score ?? '-'}</td>
                  <td style={{ textAlign:'center' }}>{h.indication_score ?? '-'}</td>
                  <td style={{ textAlign:'center' }}>{h.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
              
            </div>
          </section>
        )}

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
            <select value={scanType} onChange={e=>{ const v=e.target.value; setScanType(v); setOtherScanType('') }}>
              <option value="">Select scan type</option>
              {['CT Head (trauma)','CT Head (non-trauma)','CT Abdomen/Pelvis','CT Pulmonary Angiogram','CT Spine','CT Angiogram (other)','CT KUB','Other'].map(s=><option key={s}>{s}</option>)}
            </select>
            {scanType==='Other' && (
              <div style={{ marginTop: 8 }}>
                <label>Scan type (Mandatory)</label>
                <input value={otherScanType} onChange={e=>setOtherScanType(e.target.value)} />
              </div>
            )}
          </div>

        <div style={{ marginTop: 12 }}>
          <label>Outcome</label>
          <div className="row">
            {OUTCOME_OPTIONS.map(o=>(
              <button key={o.value}
                className={'chip ' + (selectedOutcome===o.value ? 'chip--active' : '')}
                style={{ cursor:'pointer' }}
                onClick={()=>setSelectedOutcome(o.value)}
                title={
                  o.value==='accepted'
                    ? 'Do OOH'
                    : o.value==='delayed'
                    ? 'Do in-hours'
                    : o.value==='rejected'
                    ? 'Not indicated'
                    : 'Needs more info'
                }
              >{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Indication: Please rate how appropriate the indication was for this request.</label>
          <div className="rating">
            <input
              type="range"
              min="1"
              max="10"
              value={reqAppropriateness || 5}
              onChange={e=>setReqAppropriateness(parseInt(e.target.value))}
            />
            <span className="rating__value">{reqAppropriateness || '-'}</span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Clinical information: Please rate the quality of the clinical information provided.</label>
          <div className="rating">
            <input
              type="range"
              min="1"
              max="10"
              value={reqQuality || 5}
              onChange={e=>setReqQuality(parseInt(e.target.value))}
            />
            <span className="rating__value">{reqQuality || '-'}</span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Feedback on request:</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Do NOT include patient identifiers" rows={3} />
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ minWidth: 240, flex:'1 1 240px' }}><label>Radiologist GMC (mandatory)</label>
            <input value={radGmc} onChange={e=>setRadGmc(e.target.value.replace(/\D/g,'').slice(0,7))} onKeyDown={e=>{ if(e.key==='Enter' && canSave) saveEpisode() }} placeholder="7-digit GMC" maxLength={7} inputMode="numeric" />
          </div>
        </div>

          <div className="actions" style={{ marginTop: 12 }}>
            <button
              className={canSave ? 'primary' : ''}
              disabled={!canSave}
              onClick={saveEpisode}
              title={canSave ? 'Save vetting' : 'Fill mandatory fields'}
              style={{ cursor: canSave ? 'pointer' : 'not-allowed' }}
            >
              Save
            </button>
            {saved && <span style={{ marginLeft: 12 }}>{saved}</span>}
          </div>
        {msg && <p className="error">{msg}</p>}
      </section>
      <section className="Card">
      {snapshot && (
          <SummaryCard
            stats={snapshot.stats}
            score={snapshot.user.score}
            requests={snapshot.requests}
            showLegend
            style={{ marginTop: 12 }}
            rankings={snapshotRankings}
          />
        )}
      </section>
    </div>
  )
}
