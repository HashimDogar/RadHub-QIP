import React, { useState } from 'react'
import PieChart from '../components/PieChart'
import { getUser, getModules, getModule, submitModule, updateUser, gmcLookup, getRank } from '../lib/api'

const HOSPITALS = ['Whiston Hospital','Southport Hospital','Ormskirk Hospital']

export default function Dashboard() {
  const [gmc, setGmc] = useState('')
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [recognised, setRecognised] = useState(null)  // null=unknown, false=not found, true=ok

  // signup fields when not recognised
  const [signupName, setSignupName] = useState('')
  const [signupSpec, setSignupSpec] = useState('')
  const [signupGrade, setSignupGrade] = useState('')
  const [signupHosp, setSignupHosp] = useState('')

  // ranking
  const [rankMetric, setRankMetric] = useState('score')
  const [rankBy, setRankBy] = useState('hospital')
  const [rankValue, setRankValue] = useState('')
  const [rankData, setRankData] = useState(null)

  const isGmcValid = /^\d{7}$/.test(gmc)

  async function fetchUser() {
    if (!isGmcValid) { setMsg('GMC must be 7 digits.'); setRecognised(null); setData(null); return }
    const res = await getUser(gmc.trim())
    if (res && !res.error) { setData(res); setMsg(''); setRecognised(true) }
    else { setData(null); setRecognised(false); setMsg(res?.error || 'Unable to load user.'); try { const lk = await gmcLookup(gmc.trim()); setSignupName(lk?.name || ''); } catch(e) {} }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Your dashboard</h2>
        <div className="row">
          <div>
            <label>Enter your GMC</label>
            <input
              value={gmc}
              onChange={e=>setGmc(e.target.value.replace(/\D/g,'').slice(0,7))}
              onKeyDown={e=>{ if(e.key==='Enter' && isGmcValid) fetchUser() }}
              placeholder="7-digit GMC"
              maxLength={7}
              inputMode="numeric"
            />
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" disabled={!isGmcValid} onClick={fetchUser} title={!isGmcValid ? 'Enter a 7-digit GMC' : 'Load dashboard'}>View</button>
          </div>
        </div>
        {msg && <p className="error">{msg}</p>}
      </section>

      {/* About card always visible */}
      <section className="card">
        <h3>About</h3>
        <p>This tool supports safe out-of-hours CT vetting, provides personalised feedback, and offers eLearning based on iRefer guidance.</p>
      </section>

      {recognised ? (
        <>
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

          <section className="card" style={{ marginTop: 12 }}>
            <h3>Update your profile</h3>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <div>
                <label>Specialty</label>
                <select id="self_spec">
                  <option value="">Select specialty</option>
                  <option>Emergency Medicine</option>
                  <option>General (Internal) Medicine</option>
                  <option>General Surgery</option>
                  <option>Orthopaedic Surgery</option>
                  <option>Plastic Surgery</option>
                  <option>Neurosurgery</option>
                  <option>Urology</option>
                  <option>ENT (Otolaryngology)</option>
                  <option>Maxillofacial Surgery</option>
                  <option>Paediatrics</option>
                  <option>Obstetrics & Gynaecology</option>
                  <option>Intensive Care</option>
                  <option>Anaesthetics</option>
                  <option>Cardiology</option>
                  <option>Neurology</option>
                  <option>Oncology</option>
                  <option>Geriatrics</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label>Grade</label>
                <select id="self_grade">
                  <option value="">Select grade</option>
                  <option>FY1</option><option>FY2</option>
                  <option>CT1</option><option>CT2</option><option>CT3</option>
                  <option>IMT1</option><option>IMT2</option><option>IMT3</option>
                  <option>SHO</option><option>Registrar</option><option>ST4+</option>
                  <option>Consultant</option><option>Other</option>
                </select>
              </div>
              <div>
                <label>Hospital</label>
                <select id="self_hosp">
                  <option value="">Select hospital</option>
                  <option>Whiston Hospital</option>
                  <option>Southport Hospital</option>
                  <option>Ormskirk Hospital</option>
                </select>
              </div>
            </div>
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="button" onClick={async ()=>{
                const spec = document.getElementById('self_spec').value || null
                const grade = document.getElementById('self_grade').value || null
                const hosp = document.getElementById('self_hosp').value || null
                if (!spec && !grade && !hosp) { alert('Choose specialty/grade/hospital'); return }
                const r = await updateUser(gmc.trim(), { specialty: spec, grade, hospital: hosp })
                if (r && r.ok) { alert('Profile updated'); await fetchUser(); }
                else alert(r && r.error ? r.error : 'Update failed')
              }}>Save profile</button>
            </div>
          </section>

          {/* Pie: accepted includes overrides */}
          <section className="card">
            <h3>Summary</h3>
            <div className="row" style={{ alignItems:'center' }}>
              <PieChart data={[
                { label: 'Accepted (incl. overrides)', value: (data.stats.counts.accepted + data.stats.counts.override) },
                { label: 'Delayed', value: data.stats.counts.delayed },
                { label: 'Rejected', value: data.stats.counts.rejected },
              ]} />
              <div>
                <div>Overrides: <strong>{data.stats.counts.override}</strong></div>
              </div>
            </div>
          </section>

          {/* Ranking panel */}
          <section className="card" style={{ marginTop: 12 }}>
            <h3>Ranking</h3>
            <div className="row">
              <div>
                <label>Metric</label>
                <select value={rankMetric} onChange={e=>setRankMetric(e.target.value)}>
                  <option value="score">Score</option>
                  <option value="pct_accepted">% Accepted</option>
                  <option value="pct_rejected">% Rejected</option>
                  <option value="pct_delayed">% Delayed</option>
                </select>
              </div>
              <div>
                <label>Compare by</label>
                <select value={rankBy} onChange={e=>setRankBy(e.target.value)}>
                  <option value="hospital">Hospital</option>
                  <option value="specialty">Specialty</option>
                </select>
              </div>
              <div>
                <label>Value</label>
                <select value={rankValue} onChange={e=>setRankValue(e.target.value)}>
                  <option value="">Select</option>
                  <option>Whiston Hospital</option>
                  <option>Southport Hospital</option>
                  <option>Ormskirk Hospital</option>
                  <option>Emergency Medicine</option>
                  <option>General (Internal) Medicine</option>
                  <option>General Surgery</option>
                  <option>Orthopaedic Surgery</option>
                  <option>Plastic Surgery</option>
                  <option>Neurosurgery</option>
                  <option>Urology</option>
                  <option>ENT (Otolaryngology)</option>
                  <option>Maxillofacial Surgery</option>
                  <option>Paediatrics</option>
                  <option>Obstetrics & Gynaecology</option>
                  <option>Intensive Care</option>
                  <option>Anaesthetics</option>
                  <option>Cardiology</option>
                  <option>Neurology</option>
                  <option>Oncology</option>
                  <option>Geriatrics</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="actions" style={{ alignSelf:'end' }}>
                <button className="button" onClick={async ()=>{
                  if (!rankBy || !rankValue) { alert('Choose comparison value'); return }
                  const r = await getRank(rankMetric, { by: rankBy, value: rankValue, gmc: gmc.trim() })
                  setRankData(r)
                }}>Update</button>
              </div>
            </div>
            {rankData && (
              <div style={{ marginTop: 8 }}>
                <div>Percentile: <strong>{rankData.percentile ?? '-'}</strong></div>
                <table className="table" style={{ marginTop: 6 }}>
                  <thead><tr><th>GMC</th><th>Name</th><th>Hospital</th><th>Specialty</th><th>Grade</th><th>Score</th><th>%Acc</th><th>%Del</th><th>%Rej</th></tr></thead>
                  <tbody>
                    {rankData.rows.map((r,i)=>(
                      <tr key={r.gmc + i} className={r.gmc===gmc ? 'me' : ''}>
                        <td>{r.gmc}</td>
                        <td>{r.name || '-'}</td>
                        <td>{r.hospital || '-'}</td>
                        <td>{r.specialty || '-'}</td>
                        <td>{r.grade || '-'}</td>
                        <td>{Math.round(r.score)}</td>
                        <td>{r.pct_accepted.toFixed(0)}%</td>
                        <td>{r.pct_delayed.toFixed(0)}%</td>
                        <td>{r.pct_rejected.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Modules … left as in your build; they’ll show for recognised users */}
        </>
      ) : (!recognised && isGmcValid) ? (
        <section className="card">
          <h2>User not recognised</h2>
          <div className="kpis" style={{ marginBottom:8 }}>
            <div className="kpi"><div>GMC</div><strong>{gmc}</strong></div>
            <div className="kpi"><div>Name (from GMC)</div><strong>{signupName || '-'}</strong></div>
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div>
              <label>Name</label>
              <input value={signupName} onChange={e=>setSignupName(e.target.value)} placeholder="Auto from GMC (editable)" />
            </div>
            <div>
              <label>Specialty</label>
              <select value={signupSpec} onChange={e=>setSignupSpec(e.target.value)}>
                <option value="">Select specialty</option>
                <option>Emergency Medicine</option>
                <option>General (Internal) Medicine</option>
                <option>General Surgery</option>
                <option>Orthopaedic Surgery</option>
                <option>Plastic Surgery</option>
                <option>Neurosurgery</option>
                <option>Urology</option>
                <option>ENT (Otolaryngology)</option>
                <option>Maxillofacial Surgery</option>
                <option>Paediatrics</option>
                <option>Obstetrics & Gynaecology</option>
                <option>Intensive Care</option>
                <option>Anaesthetics</option>
                <option>Cardiology</option>
                <option>Neurology</option>
                <option>Oncology</option>
                <option>Geriatrics</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label>Grade</label>
              <select value={signupGrade} onChange={e=>setSignupGrade(e.target.value)}>
                <option value="">Select grade</option>
                <option>FY1</option><option>FY2</option>
                <option>CT1</option><option>CT2</option><option>CT3</option>
                <option>IMT1</option><option>IMT2</option><option>IMT3</option>
                <option>SHO</option><option>Registrar</option><option>ST4+</option>
                <option>Consultant</option><option>Other</option>
              </select>
            </div>
            <div>
              <label>Hospital</label>
              <select value={signupHosp} onChange={e=>setSignupHosp(e.target.value)}>
                <option value="">Select hospital</option>
                <option>Whiston Hospital</option>
                <option>Southport Hospital</option>
                <option>Ormskirk Hospital</option>
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="primary" onClick={async ()=>{
              if (!signupName || !signupSpec || !signupGrade || !signupHosp) { alert('Please complete name, specialty, grade and hospital'); return }
              const r = await updateUser(gmc.trim(), { name: signupName, specialty: signupSpec, grade: signupGrade, hospital: signupHosp })
              if (r && r.ok) { alert('Profile created'); await fetchUser(); }
              else alert(r && r.error ? r.error : 'Could not create profile')
            }}>Create profile</button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
