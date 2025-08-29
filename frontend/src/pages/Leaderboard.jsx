import React, { useState, useEffect } from 'react'
import { getRank, getUser } from '../lib/api'

const HOSPITALS = ['Whiston Hospital','Southport Hospital','Ormskirk Hospital']
const SPECIALTIES = ['Emergency Medicine','General (Internal) Medicine','General Surgery','Orthopaedic Surgery','Plastic Surgery','Neurosurgery','Urology','ENT (Otolaryngology)','Maxillofacial Surgery','Paediatrics','Obstetrics & Gynaecology','Intensive Care','Anaesthetics','Cardiology','Neurology','Oncology','Geriatrics','Other']

function LeaderboardTable({ metric, title, hospital, specialty, highlightGmc }){
  const [limit, setLimit] = useState(10)
  const [rows, setRows] = useState([])
  const [info, setInfo] = useState(null)

  useEffect(()=>{ load() }, [metric, hospital, specialty, highlightGmc, limit])

  async function load(){
    const params = { limit }
    if (hospital) params.hospital = hospital
    if (specialty) params.specialty = specialty
    if (highlightGmc) params.gmc = highlightGmc
    const r = await getRank(metric, params)
    setRows(r.rows || [])
    setInfo(r)
  }

  const keyMap = { score:'requestor_score_rating', quality:'avg_quality', appropriateness:'avg_appropriateness' }
  const key = keyMap[metric] || metric
  const population = hospital && specialty ? `${hospital} / ${specialty}` : (hospital || specialty || 'Global')

  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="muted" style={{ marginTop:0 }}>{population}</p>
      {highlightGmc && info && info.rank_index >= 0 && (
        <p className="muted" style={{ marginTop:0 }}>You are ranked {info.rank_index+1} of {info.total}</p>
      )}
      <div style={{ overflowX:'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Hospital</th>
              <th>Specialty</th>
              <th style={{ textAlign:'center' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> r.ellipsis ? (
              <tr key="ellipsis"><td colSpan={5} style={{ textAlign:'center' }}>...</td></tr>
            ) : (
              <tr key={r.gmc} style={highlightGmc===r.gmc?{ background:'#ffd' }:null}>
                <td>{r.rank}</td>
                <td>{r.name || '-'}</td>
                <td>{r.hospital || '-'}</td>
                <td>{r.specialty || '-'}</td>
                <td style={{ textAlign:'center' }}>{metric==='score' ? (r.requestor_score_rating!=null ? Number(r.requestor_score_rating).toFixed(1) : '-') : (r[key]!=null ? Number(r[key]).toFixed(1) : '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit===10 && info && info.total>10 && (
        <button style={{ marginTop:8 }} onClick={()=>setLimit(50)}>Show top 50</button>
      )}
    </section>
  )
}

export default function Leaderboard(){
  const [gmc, setGmc] = useState('')
  const [localUser, setLocalUser] = useState(null)
  const [findHospital, setFindHospital] = useState('')
  const [findSpecialty, setFindSpecialty] = useState('')
  const [find, setFind] = useState(0)

  async function lookup(){
    const g = gmc.trim()
    if(!/^\d{7}$/.test(g)){ alert('Enter valid GMC'); return }
    const r = await getUser(g)
    if(r && !r.error){ setLocalUser(r.user) } else alert(r?.error||'User not recognised')
  }

  return (
    <div className="grid">
      <LeaderboardTable metric="score" title="Overall rating" />
      <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))' }}>
        <LeaderboardTable metric="quality" title="Clinical Information rating" />
        <LeaderboardTable metric="appropriateness" title="Request indication rating" />
      </div>

      <section className="card" style={{ marginTop:'2rem' }}>
        <h3>Type in your GMC number to see your local leaderboard</h3>
        <form className="row" onSubmit={e=>{e.preventDefault(); lookup();}}>
          <div style={{ minWidth:240, flex:'1 1 240px' }}>
            <label>GMC number</label>
            <input value={gmc} onChange={e=>setGmc(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7-digit GMC" maxLength={7} inputMode="numeric" />
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" type="submit">View</button>
          </div>
        </form>
      </section>

      {localUser && (
        <>
          <LeaderboardTable metric="score" title="Overall rating" hospital={localUser.hospital} specialty={localUser.specialty} highlightGmc={localUser.gmc} />
          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))' }}>
            <LeaderboardTable metric="quality" title="Clinical Information rating" hospital={localUser.hospital} specialty={localUser.specialty} highlightGmc={localUser.gmc} />
            <LeaderboardTable metric="appropriateness" title="Request indication rating" hospital={localUser.hospital} specialty={localUser.specialty} highlightGmc={localUser.gmc} />
          </div>
        </>
      )}

      <section className="card" style={{ marginTop:'2rem' }}>
        <h3>Find leaderboard</h3>
        <div className="row">
          <div style={{ minWidth:220, flex:'1 1 220px' }}>
            <label>Hospital</label>
            <select value={findHospital} onChange={e=>setFindHospital(e.target.value)}>
              <option value="">Select hospital</option>
              {HOSPITALS.map(h=><option key={h}>{h}</option>)}
            </select>
          </div>
          <div style={{ minWidth:220, flex:'1 1 220px' }}>
            <label>Specialty</label>
            <select value={findSpecialty} onChange={e=>setFindSpecialty(e.target.value)}>
              <option value="">Select specialty</option>
             {SPECIALTIES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" onClick={()=>setFind(find+1)} disabled={!findHospital && !findSpecialty}>Show</button>
          </div>
        </div>
      </section>

      {(findHospital || findSpecialty) && find>0 && (
        <>
          <LeaderboardTable metric="score" title="Overall rating" hospital={findHospital || undefined} specialty={findSpecialty || undefined} />
          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))' }}>
            <LeaderboardTable metric="quality" title="Clinical Information rating" hospital={findHospital || undefined} specialty={findSpecialty || undefined} />
            <LeaderboardTable metric="appropriateness" title="Request indication rating" hospital={findHospital || undefined} specialty={findSpecialty || undefined} />
          </div>
        </>
      )}
    </div>
  )
}
