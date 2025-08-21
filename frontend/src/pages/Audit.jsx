
import React, { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function Audit() {
  const [pin, setPin] = useState('')
  const [ok, setOk] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  function unlock() {
    if (pin.trim() === '221199') setOk(true)
  }

  function last30() {
    const d = new Date()
    const toStr = d.toISOString().slice(0,10)
    d.setDate(d.getDate() - 30)
    const fromStr = d.toISOString().slice(0,10)
    setFrom(fromStr)
    setTo(toStr)
  }

  const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s)
  const rangeOk = isValidDate(from) && isValidDate(to)

  function handleDownload() {
    if (!rangeOk) return
    const q = new URLSearchParams({ from, to }).toString()
    const url = `${API_URL}/api/v1/export/all.csv?${q}`
    window.open(url, '_blank')
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Audit</h2>

        {!ok ? (
          <>
            <p>Enter the audit PIN to unlock the raw CSV export.</p>
            <label>Audit PIN</label>
            <input value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" />
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="primary" onClick={unlock}>Unlock</button>
            </div>
          </>
        ) : (
          <>
            <p>
              Download a single <strong>raw CSV</strong> of all records (no patient identifiers).<br/>
              Set a date range or click <em>Last 30 days</em> to prefill, then the download button will enable.
            </p>

            <div style={{ display:'flex', gap: 12, flexWrap:'wrap', alignItems:'end' }}>
              <div>
                <label>From (YYYY-MM-DD)</label>
                <input value={from} onChange={e => setFrom(e.target.value)} placeholder="e.g. 2025-01-01" />
              </div>
              <div>
                <label>To (YYYY-MM-DD)</label>
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="e.g. 2025-12-31" />
              </div>
              <div>
                <button onClick={last30}>Last 30 days</button>
              </div>
            </div>

            <div className="actions" style={{ marginTop: 12 }}>
              <button
                className="primary"
                onClick={handleDownload}
                disabled={!rangeOk}
                title={!rangeOk ? 'Set From and To (YYYY-MM-DD)' : 'Download raw CSV for the selected range'}
              >
                Download: Raw CSV (date range)
              </button>
            </div>

            <p><small className="muted">
              Columns include: id, created_at, requester_gmc, radiologist_gmc, requester_score_at_request, discussed_with_senior, scan_type, outcome, points_change, reason.
            </small></p>
          </>
        )}
      </section>
    </div>
  )
}
