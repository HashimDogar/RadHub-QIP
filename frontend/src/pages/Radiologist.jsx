
import React, { useEffect, useState } from 'react'
import { getUser, getScanTypes, vet, radUnlock, radSession, updateUser } from '../lib/api'
import PieChart from '../components/PieChart'

const GRADE_OPTIONS = ['FY1','FY2','CT1','CT2','CT3','IMT1','IMT2','IMT3','SHO','Registrar','ST4+','Consultant','Other']
const SPECIALTIES = [
  'Emergency Medicine', 'General (Internal) Medicine', 'General Surgery',
  'Orthopaedic Surgery', 'Plastic Surgery', 'Neurosurgery', 'Urology',
  'ENT (Otolaryngology)', 'Maxillofacial Surgery', 'Paediatrics',
  'Obstetrics & Gynaecology', 'Intensive Care', 'Anaesthetics',
  'Cardiology', 'Neurology', 'Oncology', 'Geriatrics', 'Other'
]

export default function Radiologist() {
  const [accessCode, setAccessCode] = useState('')
  const [codeOk, setCodeOk] = useState(false)

  const [gmc, setGmc] = useState('') // requester
  const [radGmc, setRadGmc] = useState('') // radiologist
  const [scanTypes, setScanTypes] = useState([])
  const [scanType, setScanType] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState('')
  const [hoverOutcome, setHoverOutcome] = useState(null)
  const [reason, setReason] = useState('')

  const [snapshot, setSnapshot] = useState(null)
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState('')

  // New requester profile capture
  const [showNewUserProfile, setShowNewUserProfile] = useState(false)
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newGrade, setNewGrade] = useState('')

  // Senior confirm (when score <300 and not override)
  const [seniorOk, setSeniorOk] = useState(false)

  useEffect(() => {
    radSession().then(s => { if (s && s.active) setCodeOk(true); })
    getScanTypes().then(d => setScanTypes(Array.isArray(d?.scanTypes) ? d.scanTypes : []))
  }, [])

  useEffect(() => { setSeniorOk(false) }, [selectedOutcome, gmc])

  async function unlock() {
    const r = await radUnlock(accessCode.trim())
    if (r && r.ok) setCodeOk(true)
    else setMsg(r?.error || 'Invalid code')
  }

  function isValidGmc(v) { return /^\d{7}$/.test((v||'').trim()) }

  async function loadSnapshot(v) {
    if (!isValidGmc(v)) { setSnapshot(null); setShowNewUserProfile(false); return }
    const res = await getUser(v.trim())
    if (!res.error) {
      setSnapshot(res)
      const isNew = (!res.user?.specialty && !res.user?.grade && (!res.requests || res.requests.length === 0))
      setShowNewUserProfile(isNew)
      if (isNew) { setNewSpecialty(''); setNewGrade(''); setScanType('') }
    } else {
      setSnapshot(null); setShowNewUserProfile(false)
    }
  }

  function outcomesForScore(score) {
    const outs = ['accepted','delayed','rejected']
    if (typeof score === 'number' && score < 300) outs.push('override')
    return outs
  }

  const needsSeniorTick = (snapshot?.user?.score < 300) && (selectedOutcome !== 'override')
  const canSave = (
    isValidGmc(gmc) &&
    isValidGmc(radGmc) &&
    !!scanType &&
    !!selectedOutcome &&
    (!needsSeniorTick || seniorOk) &&
    (!showNewUserProfile || (newSpecialty && newGrade)) // require profile fields for brand-new users
  )

  async function saveEpisode() {
    if (!canSave) { setMsg('Please complete all mandatory fields.'); return }
    const payload = {
      requester_gmc: gmc.trim(),
      radiologist_gmc: radGmc.trim(),
      scan_type: scanType,
      outcome: selectedOutcome,
      reason: reason.trim() || undefined,
    }
    if (showNewUserProfile) {
      payload.grade = newGrade
      payload.specialty = newSpecialty
    }
    const res = await vet(payload)
    if (!res || res.error) { setMsg(res?.error || 'Save failed'); return }
    setSaved('Saved. Fields cleared.')
    // clear everything
    setGmc(''); setScanType(''); setSelectedOutcome(''); setReason(''); setSnapshot(null); setShowNewUserProfile(false); setNewSpecialty(''); setNewGrade(''); setRadGmc(''); setSeniorOk(false)
    setTimeout(()=>setSaved(''), 2000)
  }

  if (!codeOk) {
    return (
      <div className="grid">
        <section className="card">
          <h2>Radiologist access</h2>
          <p>Enter the radiologist access code to unlock this page.</p>
          <label>Access code</label>
          <input value={accessCode} onChange={e=>setAccessCode(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') unlock() }} placeholder="Enter code" />
          <div className="actions">
            <button className="primary" onClick={unlock}>Unlock</button>
          </div>
          {msg && <p className="error">{msg}</p>}
        </section>
      </div>
    )
  }

  // Vetting UI
  return (
    <div className="grid">
      <section className="card">
        <h2>Out-of-hours CT vetting</h2>
        <div className="row">
          <div>
            <label>Requester GMC (mandatory)</label>
            <input
              value={gmc}
              onChange={e => { const v=e.target.value.replace(/\\D/g,'').slice(0,7); setGmc(v); loadSnapshot(v) }}
              placeholder="7-digit GMC"
              maxLength={7}
              inputMode="numeric"
            />
          </div>
        </div>

        {snapshot && (
          <section className="card" style={{ marginTop: 12 }}>
            <h3>Requester snapshot</h3>
            <div className="kpis">
              <div className="kpi"><div>GMC</div><strong>{snapshot.user.gmc}</strong></div>
              <div className="kpi"><div>Score</div><strong>{snapshot.user.score}</strong></div>
              <div className="kpi"><div>Specialty</div><strong>{snapshot.user.specialty || '-'}</strong></div>
              <div className="kpi"><div>Grade</div><strong>{snapshot.user.grade || '-'}</strong></div>
            </div>
            <div className="row" style={{ alignItems:'center' }}>
              <PieChart data={[
                { label: 'Accepted (incl. overrides)', value: (snapshot.stats.counts.accepted + snapshot.stats.counts.override) },
                { label: 'Delayed', value: snapshot.stats.counts.delayed },
                { label: 'Rejected', value: snapshot.stats.counts.rejected },
              ]} />
              <div>
                <div>Overrides: <strong>{snapshot.stats.counts.override}</strong></div>
              </div>
            </div>

            <h4 style={{ marginTop: 12 }}>Recent requests</h4>
            <table className="table">
              <thead><tr><th>Date/Time</th><th>Specialty@req</th><th>Grade@req</th><th>Scan</th><th>Outcome</th><th>Points</th><th>Reason</th></tr></thead>
              <tbody>
                {snapshot.requests.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at + 'Z').toLocaleString()}</td>
                    <td>{r.requester_specialty_at_request || '-'}</td>
                    <td>{r.requester_grade_at_request || '-'}</td>
                    <td>{r.scan_type}</td>
                    <td>{r.outcome}</td>
                    <td>{r.points_change}</td>
                    <td>{r.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {showNewUserProfile && (
          <div className="card" style={{ marginTop: 12, padding: 12, border:'1px dashed #d8d8d8', background:'#fafafa' }}>
            <h3>New requester profile</h3>
            <div style={{ display:'flex', gap: 12, flexWrap:'wrap' }}>
              <div style={{ minWidth: 220 }}>
                <label>Specialty</label>
                <select value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)}>
                  <option value="">Select specialty</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 220 }}>
                <label>Grade</label>
                <select value={newGrade} onChange={e => setNewGrade(e.target.value)}>
                  <option value="">Select grade</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <p><small className="muted">Specialty & grade will be saved with the first request for this requester.</small></p>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label>Scan type</label>
          <select value={scanType} onChange={e=>setScanType(e.target.value)}>
            <option value="">Select scan type</option>
            {scanTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Outcome</label>
          <div className="outcomes" style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
            {outcomesForScore(snapshot?.user?.score).map(out => (
              <button
                key={out}
                type="button"
                className={'chip ' + (selectedOutcome===out ? 'chip--active' : '')}
                style={{
                  cursor:'pointer', userSelect:'none',
                  border:'1px solid ' + (selectedOutcome===out ? '#2b6cb0' : '#d0d7de'),
                  background:(selectedOutcome===out ? '#e6f0ff' : (hoverOutcome===out ? '#f0f6ff' : 'white')),
                  padding:'6px 10px', borderRadius:8
                }}
                onMouseEnter={()=>setHoverOutcome(out)}
                onMouseLeave={()=>setHoverOutcome(null)}
                onClick={(e)=>{ e.preventDefault(); setSelectedOutcome(out); }}
                title={
                  out==='accepted' ? 'This scan needs to be done out of hours' :
                  out==='delayed' ? 'This scan needs to be done, but not out of hours' :
                  out==='rejected' ? 'This scan is not indicated' :
                  out==='override' ? 'Urgent: scan should proceed without senior approval' : ''
                }
              >{out}</button>
            ))}
          </div>
        </div>

        {needsSeniorTick && (
          <div className="senior-confirm" style={{ marginTop: 12, padding: 12, background:'#fdf7e7', border:'1px solid #f2e1a6', borderRadius: 8, display:'flex', alignItems:'center', gap: 8 }}>
            <input type="checkbox" id="senior_ok" style={{ width: 18, height: 18 }} checked={seniorOk} onChange={e=>setSeniorOk(e.target.checked)} />
            <div style={{ lineHeight: 1.3 }}>
              <strong>Requester score &lt; 300 —</strong> Have they discussed with senior? If not required, please select <em>override</em>.
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label>Reason (no patient identifiers)</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Brief justification. Do NOT include patient identifiers." rows={3} />
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Radiologist GMC (mandatory)</label>
            <input
              value={radGmc}
              onChange={e => setRadGmc(e.target.value.replace(/\\D/g,'').slice(0,7))}
              onKeyDown={e=>{ if(e.key==='Enter' && canSave) saveEpisode() }}
              placeholder="7-digit GMC"
              maxLength={7}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="actions" style={{ marginTop: 12 }}>
          <button
            className={canSave ? 'primary' : ''}
            disabled={!canSave}
            onClick={saveEpisode}
            title={canSave ? 'Save this vetting decision' : 'Enter mandatory fields (GMCs, scan type, outcome; senior confirmation if score <300)'}
          >
            Save
          </button>
          {saved && <span style={{ marginLeft: 12 }}>{saved}</span>}
        </div>
      </section>

      {snapshot && !showNewUserProfile && (
        <section className="card" style={{ marginTop: 12 }}>
          <h3>Change user details</h3>
          <div style={{ display:'flex', gap: 12, flexWrap:'wrap' }}>
            <div style={{ minWidth: 220 }}>
              <label>Specialty</label>
              <select id="edit_spec" defaultValue={snapshot.user.specialty || ''}>
                <option value="">Select specialty</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 220 }}>
              <label>Grade</label>
              <select id="edit_grade" defaultValue={snapshot.user.grade || ''}>
                <option value="">Select grade</option>
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="button" onClick={async ()=>{
              const spec = document.getElementById('edit_spec').value || null
              const grade = document.getElementById('edit_grade').value || null
              if (!spec && !grade) { alert('Nothing to update'); return }
              const r = await updateUser(gmc.trim(), { specialty: spec, grade })
              if (r && r.ok) {
                alert('Updated. Refreshing snapshot…')
                const res = await getUser(gmc.trim())
                if (!res.error) setSnapshot(res)
              } else alert(r && r.error ? r.error : 'Update failed')
            }}>Save changes</button>
          </div>
          <p><small className="muted">Changing specialty/grade updates the profile for future requests only. Past requests keep their original specialty/grade snapshot in audit exports.</small></p>
        </section>
      )}
    </div>
  )
}
