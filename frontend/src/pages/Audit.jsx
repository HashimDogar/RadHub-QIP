import React, { useState, useEffect } from 'react'
import { downloadRawCsv, getUsers, updateUser } from '../lib/api'

export default function Audit(){
  const [pin, setPin] = useState('')
  const [ok, setOk] = useState(false)
  const [users, setUsers] = useState([])
  const [updGmc, setUpdGmc] = useState('')
  const [newScore, setNewScore] = useState('')

  function unlock(){ if (pin.trim() === '221199') setOk(true); else alert('Incorrect PIN') }

  useEffect(()=>{ if(ok) loadUsers() }, [ok])

  async function loadUsers(){
    const r = await getUsers()
    setUsers(r.users || [])
  }

  async function doUpdate(){
    const g = updGmc.trim()
    const s = parseInt(newScore)
    if(!/^\d{7}$/.test(g) || isNaN(s)){ alert('Enter valid GMC and score'); return }
    await updateUser(g, { score:s })
    setUpdGmc('')
    setNewScore('')
    loadUsers()
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
          <table>
            <thead>
              <tr><th>Name</th><th>GMC</th><th>Score</th><th>Total</th><th>Accepted</th><th>Delayed</th><th>Rejected</th></tr>
            </thead>
            <tbody>
              {users.map(u=>
                <tr key={u.gmc}>
                  <td>{u.name || '-'}</td>
                  <td>{u.gmc}</td>
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
        <h3>Update Score</h3>
        <div className="row">
          <div style={{ minWidth:150 }}>
            <label>GMC number</label>
            <input value={updGmc} onChange={e=>setUpdGmc(e.target.value)} placeholder="e.g. 1234567" />
          </div>
          <div style={{ minWidth:150 }}>
            <label>New total score</label>
            <input type="number" value={newScore} onChange={e=>setNewScore(e.target.value)} />
          </div>
          <div className="actions" style={{ alignSelf:'end' }}>
            <button className="primary" onClick={doUpdate}>Update</button>
          </div>
        </div>
      </div>
    </section>
  )
}
