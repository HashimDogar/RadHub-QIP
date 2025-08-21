
import React, { useState, useEffect } from 'react'
import PieChart from '../components/PieChart'
import { getUser, getModules, getModule, submitModule, updateUser } from '../lib/api'

export default function Dashboard() {
  const [gmc, setGmc] = useState('')
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [recognised, setRecognised] = useState(null)  // null=unknown, false=not found, true=ok

  const isGmcValid = /^\d{7}$/.test(gmc.trim())

  async function fetchUser() {
    if (!isGmcValid) { setMsg('GMC must be 7 digits.'); setRecognised(null); setData(null); return }
    const res = await getUser(gmc.trim())
    if (res && !res.error) { setData(res); setMsg(''); setRecognised(true) }
    else { setData(null); setRecognised(false); setMsg(res?.error || 'Unable to load user.') }
  }

  // About card always visible
  return (
    <div className="grid">
      <section className="card">
        <h2>Radiology hub QIP — About</h2>
        <p>
          This tool supports <strong>safe, educational out-of-hours CT vetting</strong>. Requests are categorised by a radiologist as
          <em> accepted</em> (needs OOH), <em>delayed</em> (can be done in-hours), <em>rejected</em> (not indicated), or <em>override</em> (urgent despite score threshold).
          You start with a score of 500; accepted/override +5, delayed −5, rejected −10. If your score falls below 300, senior discussion is expected for non-override requests.
          Modules below are inspired by <a href="https://www.rcr.ac.uk/clinical-radiology/being-consultant/rcr-irefer" target="_blank" rel="noreferrer">RCR iRefer</a> to help learning.
        </p>
      </section>

      <section className="card">
        <h2>Your dashboard</h2>
        <div className="row">
          <div>
            <label>Enter your GMC</label>
            <input
              value={gmc}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0,7)
                setGmc(v)
              }}
              placeholder="7-digit GMC"
              maxLength={7}
              inputMode="numeric"
              onKeyDown={e=>{ if(e.key==="Enter" && isGmcValid) fetchUser() }}
            />
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" onClick={fetchUser} disabled={!isGmcValid} title={!isGmcValid ? 'Enter a valid 7-digit GMC' : 'Load dashboard'}>View</button>
          </div>
        </div>
        {msg && <p className="error">{msg}</p>}

        {data ? (
          <>
            <div className="kpis">
              <div className="kpi"><div>GMC</div><strong>{data.user.gmc}</strong></div>
              <div className="kpi"><div>Score</div><strong>{data.user.score}</strong></div>
              <div className="kpi"><div>Specialty</div><strong>{data.user.specialty || '-'}</strong></div>
              <div className="kpi"><div>Grade</div><strong>{data.user.grade || '-'}</strong></div>
            
            <section className="card" style={{ marginTop: 12 }}>
              <h3>Create or update your profile</h3>
              <p><small>Link your GMC to your current specialty and grade. This helps radiologists and enables learning points to be attributed correctly.</small></p>
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
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <button className="button" onClick={async ()=>{
                  const spec = document.getElementById('self_spec').value || null
                  const grade = document.getElementById('self_grade').value || null
                  if (!spec && !grade) { alert('Choose specialty and/or grade'); return }
                  const r = await updateUser(gmc.trim(), { specialty: spec, grade })
                  if (r && r.ok) { alert('Profile updated'); await fetchUser(); }
                  else alert(r && r.error ? r.error : 'Update failed')
                }}>Save profile</button>
              </div>
            </section>
</div>

            {/* Pie: accepted includes overrides */}
            <div className="row" style={{ alignItems:'center' }}>
              <PieChart data={[
                { label: 'Accepted (incl. overrides)', value: (data.stats.counts.accepted + data.stats.counts.override) },
                { label: 'Delayed', value: data.stats.counts.delayed },
                { label: 'Rejected', value: data.stats.counts.rejected },
              ]} />
              <div>
                {(() => {
                  const total = data.stats.counts.accepted + data.stats.counts.delayed + data.stats.counts.rejected + data.stats.counts.override
                  const pct = (n) => total ? Math.round((n/total)*100) : 0
                  return (
                    <>
                      <div>Accepted (incl. overrides): <strong>{data.stats.counts.accepted + data.stats.counts.override}</strong> ({pct(data.stats.counts.accepted + data.stats.counts.override)}%)</div>
                      <div>Delayed: <strong>{data.stats.counts.delayed}</strong> ({pct(data.stats.counts.delayed)}%)</div>
                      <div>Rejected: <strong>{data.stats.counts.rejected}</strong> ({pct(data.stats.counts.rejected)}%)</div>
                      <div>Overrides (subset of accepted): <strong>{data.stats.counts.override}</strong> ({pct(data.stats.counts.override)}%)</div>
                    </>
                  )
                })()}
              </div>
            </div>

            <h3 style={{ marginTop: 16 }}>Recent Requests</h3>
            <table className="table">
              <thead><tr><th>Date/Time</th><th>Scan</th><th>Outcome</th><th>Points</th><th>Reason</th></tr></thead>
              <tbody>
                {data.requests.map(r => (
                  <tr key={r.id} className={'outcome-' + r.outcome}>
                    <td>{new Date(r.created_at + 'Z').toLocaleString()}</td>
                    <td>{r.scan_type}</td>
                    <td>{r.outcome}</td>
                    <td>{r.points_change}</td>
                    <td>{r.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : <p>Enter your GMC to load your dashboard.</p>}
      </section>

      {/* Modules appear once GMC is loaded so completions credit to the right user */}
      {data && (
        <section className="card">
          <h2>eLearning Modules</h2>
          <p>These 10-question MCQs are inspired by <a href="https://www.rcr.ac.uk/clinical-radiology/being-consultant/rcr-irefer" target="_blank" rel="noreferrer">RCR iRefer</a>. Pass mark 80%. Each pass awards +100 (not repeatable within 14 days per module).</p>
          <ModuleList gmc={gmc} onDone={fetchUser} />
        </section>
      )}

      {/* If not recognised after searching, show self-registration */}
      {!recognised && isGmcValid && (
        <section className="card">
          <h2>User not recognised</h2>
          <p>We don't have a profile for GMC <strong>{gmc}</strong>. You can create one now so your score and modules can be attributed to you.</p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div>
              <label>Specialty</label>
              <select id="reg_spec">
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
              <select id="reg_grade">
                <option value="">Select grade</option>
                <option>FY1</option><option>FY2</option>
                <option>CT1</option><option>CT2</option><option>CT3</option>
                <option>IMT1</option><option>IMT2</option><option>IMT3</option>
                <option>SHO</option><option>Registrar</option><option>ST4+</option>
                <option>Consultant</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="primary" onClick={async ()=>{
              const spec = document.getElementById('reg_spec').value || null
              const grade = document.getElementById('reg_grade').value || null
              if (!spec || !grade) { alert('Please select specialty and grade'); return }
              const r = await updateUser(gmc.trim(), { specialty: spec, grade })
              if (r && r.ok) { alert('Profile created'); await fetchUser(); }
              else alert(r && r.error ? r.error : 'Could not create profile')
            }}>Create profile</button>
          </div>
        </section>
      )}
    </div>
  )
}

function ModuleList({ gmc, onDone }) {
  const [mods, setMods] = useState([])
  const [openId, setOpenId] = useState(null)
  const [moduleData, setModuleData] = useState(null)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getModules().then(r => setMods(r.modules || [])) }, [])

  async function openModule(id) {
    setResult(null); setLoading(true)
    const m = await getModule(id)
    setLoading(false)
    setModuleData(m)
    setOpenId(id)
    setAnswers(new Array((m.questions || []).length).fill(null))
  }

  async function submit() {
    if (!moduleData) return
    if (answers.some(a => a === null)) { alert('Please answer all questions'); return; }
    setLoading(true)
    const r = await submitModule(gmc.trim(), moduleData.id, answers)
    setLoading(false)
    if (!r || r.error) { alert(r && r.error ? r.error : 'Submission failed'); return; }
    setResult(r)
    if (r && r.ok) onDone && onDone()
  }

  return (
    <div>
      {!openId ? (
        <div className="modules-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:12 }}>
          {mods.map(m => (
            <div key={m.id} className="card" style={{ padding:12 }}>
              <h3>{m.title}</h3>
              <p><small>{m.question_count} questions • Pass {m.pass_mark_percent}% • <a href={m.source_url} target="_blank" rel="noreferrer">iRefer</a></small></p>
              <button className="button" onClick={()=>openModule(m.id)}>Start</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding:12, overflow:'hidden' }}>
          <h3>{moduleData.title}</h3>
          <p><small>Inspired by <a href={moduleData.source_url} target="_blank" rel="noreferrer">RCR iRefer</a>. Answer all 10 questions, then submit.</small></p>
          {(moduleData.questions||[]).map((q, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <div style={{ wordBreak:'break-word' }}><strong>Q{idx+1}.</strong> {q.q}</div>
              <div style={{ marginTop: 6, display:'grid', gap:6 }}>
                {q.options.map((opt, oi) => (
                  <label key={oi} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'6px 8px', border:'1px solid #e6e8eb', borderRadius:8, background:'#fff' }}>
                    <input type="radio" name={'q'+idx} checked={answers[idx]===oi} onChange={()=>{
                      const a=[...answers]; a[idx]=oi; setAnswers(a);
                    }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="actions" style={{ display:'flex', gap:8 }}>
            <button onClick={()=>{setOpenId(null); setModuleData(null); setAnswers([]); setResult(null);}}>Cancel</button>
            <button className="primary" onClick={submit} disabled={loading}>{loading ? 'Submitting…' : 'Submit'}</button>
          </div>
          {result && (
            <div style={{ marginTop:12 }}>
              <h4>{result.passed ? '✅ Passed' : '❌ Not passed'}</h4>
              <div>Score: <strong>{result.score_percent}%</strong> ({result.correct}/{result.total})</div>
              <div style={{ marginTop:8 }}>
                <details>
                  <summary>Show feedback</summary>
                  <ol>
                    {result.details.map((d, i) => (
                      <li key={i} style={{ marginBottom:6 }}>
                        <div>{d.question}</div>
                        <div><small>Your answer: {typeof d.selected==='number' ? (d.selected+1) : '-'} {d.correct ? '(correct)' : '(incorrect)'} — Correct answer: {typeof d.correctIndex==='number' ? (d.correctIndex+1) : '-'}{typeof d.correctIndex==='number' ? ' (' + (d.options ? d.options[d.correctIndex] : '') + ')' : ''}</small></div>
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
              {result.source_url && <p><a href={result.source_url} target="_blank" rel="noreferrer">Review iRefer guidance</a></p>}
              {Array.isArray(result.summary) && result.summary.length > 0 && (
                <div className="card" style={{ marginTop: 10, background:'#f7f9fc' }}>
                  <h4>iRefer summary</h4>
                  <ul>
                    {result.summary.map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* If not recognised after searching, show self-registration */}
      {!recognised && isGmcValid && (
        <section className="card">
          <h2>User not recognised</h2>
          <p>We don't have a profile for GMC <strong>{gmc}</strong>. You can create one now so your score and modules can be attributed to you.</p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div>
              <label>Specialty</label>
              <select id="reg_spec">
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
              <select id="reg_grade">
                <option value="">Select grade</option>
                <option>FY1</option><option>FY2</option>
                <option>CT1</option><option>CT2</option><option>CT3</option>
                <option>IMT1</option><option>IMT2</option><option>IMT3</option>
                <option>SHO</option><option>Registrar</option><option>ST4+</option>
                <option>Consultant</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="primary" onClick={async ()=>{
              const spec = document.getElementById('reg_spec').value || null
              const grade = document.getElementById('reg_grade').value || null
              if (!spec || !grade) { alert('Please select specialty and grade'); return }
              const r = await updateUser(gmc.trim(), { specialty: spec, grade })
              if (r && r.ok) { alert('Profile created'); await fetchUser(); }
              else alert(r && r.error ? r.error : 'Could not create profile')
            }}>Create profile</button>
          </div>
        </section>
      )}
    </div>
  )
}
