import React, { useState } from 'react'
import { downloadRawCsv } from '../lib/api'

export default function Audit(){
  const [pin, setPin] = useState('')
  const [ok, setOk] = useState(false)
  function unlock(){ if (pin.trim() === '221199') setOk(true); else alert('Incorrect PIN') }
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
    </section>
  )
}
