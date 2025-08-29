import React, { useState, useEffect } from 'react'
import { downloadRawCsv, getUsers, getRadiologists, updateUser, deleteUser, getUser } from '../lib/api'

export default function Audit(){
  const [pin, setPin] = useState('')
  const [ok, setOk] = useState(false)
  const [users, setUsers] = useState([])
  const [rads, setRads] = useState([])
  const [updGmc, setUpdGmc] = useState('')
  const [updName, setUpdName] = useState('')
  const [updHospital, setUpdHospital] = useState('')
  const [updSpecialty, setUpdSpecialty] = useState('')
  const [updGrade, setUpdGrade] = useState('')
  const [newScore, setNewScore] = useState('')

  function unlock(){ if (pin.trim() === '221199') setOk(true); else alert('Incorrect PIN') }

  useEffect(()=>{ if(ok){ loadUsers(); loadRads() } }, [ok])

  useEffect(()=>{
    const g = updGmc.trim()
    if(/^\d{7}$/.test(g)){
      getUser(g).then(r=>{
        if(r && r.user){
          setUpdName(r.user.name || '')
          setUpdHospital(r.user.hospital || '')
          setUpdSpecialty(r.user.specialty || '')
          setUpdGrade(r.user.grade || '')
          setNewScore(String(r.user.score ?? ''))
        } else {
          setUpdName('')
          setUpdHospital('')
          setUpdSpecialty('')
          setUpdGrade('')
          setNewScore('')
        }
      }).catch(()=>{
        setUpdName('')
        setUpdHospital('')
        setUpdSpecialty('')
        setUpdGrade('')
        setNewScore('')
      })
    } else {
      setUpdName('')
      setUpdHospital('')
      setUpdSpecialty('')
      setUpdGrade('')
      setNewScore('')
    }
  }, [updGmc])

  async function loadUsers(){
    const r = await getUsers()
    setUsers(r.users || [])
  }

  async function loadRads(){
    const r = await getRadiologists()
    setRads(r.radiologists || [])
  }

  async function doUpdate(){
    const g = updGmc.trim()
    if(!/^\d{7}$/.test(g)){ alert('Enter valid GMC'); return }
    const payload = {}
    if (updName.trim()) payload.name = updName.trim()
    if (updHospital.trim()) payload.hospital = updHospital.trim()
    if (updSpecialty.trim()) payload.specialty = updSpecialty.trim()
    if (updGrade.trim()) payload.grade = updGrade.trim()
    if (newScore.trim() !== ''){
      const s = parseInt(newScore)
      if (isNaN(s)) { alert('Enter valid score'); return }
      payload.score = s
    }
    if (Object.keys(payload).length === 0){ alert('Enter details to update'); return }
    await updateUser(g, payload)
    setUpdGmc('')
    setUpdName('')
    setUpdHospital('')
    setUpdSpecialty('')
    setUpdGrade('')
    setNewScore('')
    loadUsers()
  }

  async function doDelete(){
    const g = updGmc.trim()
    if(!/^\d{7}$/.test(g)){ alert('Enter valid GMC'); return }
    if(!window.confirm('Delete this user?')) return
    await deleteUser(g)
    setUpdGmc('')
    setUpdName('')
    setUpdHospital('')
    setUpdSpecialty('')
    setUpdGrade('')
    setNewScore('')
    loadUsers()
    loadRads()
  }

  if (!ok){
    return (
      <section className="card">
        <h2>Audit</h2>
        <p className="muted">Enter PIN to download raw data CSV.</p>
        <div className="row">
          <div style={{ minWidth: 220, flex:'1 1 220px' }}>
            <label>PIN</label>
            <input value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') unlock() }} placeholder="221199" />
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" onClick={unlock}>Unlock</button>
          </div>
        </div>
      </section>
    )
  }

  const url = downloadRawCsv()
  return (
    <section className="card">
      <h2>Audit exports</h2>
      <p className="muted">Download all raw request data as a single CSV (includes role snapshots at request time).</p>
      <a className="chip" href={url} target="_blank" rel="noreferrer">Download raw CSV</a>

      <div style={{ marginTop:'2rem' }}>
        <h3>Registered Users</h3>
        <div style={{ overflowX:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>GMC</th>
                <th>Hospital</th>
                <th>Specialty</th>
                <th>Grade</th>
                <th>Score</th>
                <th>Total</th>
                <th>Accepted</th>
                <th>Delayed</th>
                <th>Rejected</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u=>
                <tr key={u.gmc}>
                  <td>{u.name || '-'}</td>
                  <td>{u.gmc}</td>
                  <td>{u.hospital || '-'}</td>
                  <td>{u.specialty || '-'}</td>
                  <td>{u.grade || '-'}</td>
                  <td>{u.score}</td>
                  <td>{u.total}</td>
                  <td>{u.accepted}</td>
                  <td>{u.delayed}</td>
                  <td>{u.rejected}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop:'2rem' }}>
        <h3>Registered Radiologists</h3>
        <div style={{ overflowX:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>GMC</th>
                <th>Name</th>
                <th>Requests Vetted</th>
                <th>Accepted</th>
                <th>Delayed</th>
                <th>Rejected</th>
                <th>More Info</th>
                <th>Avg Appropriateness</th>
                <th>Avg Quality</th>
              </tr>
            </thead>
            <tbody>
              {rads.map(r=>
                <tr key={r.gmc}>
                  <td>{r.gmc}</td>
                  <td>{r.name || '-'}</td>
                  <td>{r.total}</td>
                  <td>{r.accepted}</td>
                  <td>{r.delayed}</td>
                  <td>{r.rejected}</td>
                  <td>{r.info_needed}</td>
                  <td>{r.avg_appropriateness != null ? r.avg_appropriateness.toFixed(2) : '-'}</td>
                  <td>{r.avg_quality != null ? r.avg_quality.toFixed(2) : '-'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop:'2rem' }}>
        <h3>Manage User</h3>
        <div className="row">
          <div style={{ minWidth:150 }}>
            <label>GMC number</label>
            <input value={updGmc} onChange={e=>setUpdGmc(e.target.value)} placeholder="e.g. 1234567" />
          </div>
          <div style={{ minWidth:150 }}>
            <label>Name</label>
            <input value={updName} onChange={e=>setUpdName(e.target.value)} />
          </div>
          <div style={{ minWidth:150 }}>
            <label>Hospital</label>
            <input value={updHospital} onChange={e=>setUpdHospital(e.target.value)} />
          </div>
          <div style={{ minWidth:150 }}>
            <label>Specialty</label>
            <input value={updSpecialty} onChange={e=>setUpdSpecialty(e.target.value)} />
          </div>
          <div style={{ minWidth:150 }}>
            <label>Grade</label>
            <input value={updGrade} onChange={e=>setUpdGrade(e.target.value)} />
          </div>
          <div style={{ minWidth:150 }}>
            <label>New total score</label>
            <input type="number" value={newScore} onChange={e=>setNewScore(e.target.value)} />
          </div>
          <div className="actions" style={{ alignSelf:'end', display:'flex', gap:'8px' }}>
            <button className="primary" onClick={doUpdate}>Update</button>
            <button onClick={doDelete}>Delete</button>
          </div>
        </div>
      </div>
    </section>
  )
}
