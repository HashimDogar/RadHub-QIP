import React, { useState } from 'react'

function parseDate(dateString) {
  if (!dateString) return null
  const iso = dateString.replace(' ', 'T') + 'Z'
  const parsed = new Date(iso)
  return isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(dateString) {
  const parsed = parseDate(dateString)
  if (!parsed) return '—'
  const date = parsed.toLocaleDateString()
  const time = parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function formatOutcome(outcome) {
  switch (outcome) {
    case 'accepted':
      return 'Accepted'
    case 'rejected':
      return 'Rejected'
    case 'delayed':
      return 'Delayed'
    case 'info_needed':
      return 'More info'
    default:
      return outcome ? outcome : '—'
  }
}

function outcomeClass(outcome) {
  switch (outcome) {
    case 'accepted':
    case 'rejected':
    case 'delayed':
    case 'info_needed':
      return `outcome-${outcome}`
    default:
      return ''
  }
}

function formatSigFig(value) {
  if (value == null) return '—'
  const num = Number(value)
  if (isNaN(num)) return value
  return Number(num.toPrecision(3)).toString()
}

export default function RecentRequestHistory({ requests = [] }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...requests].sort((a, b) => {
    const dA = parseDate(a.created_at) || 0
    const dB = parseDate(b.created_at) || 0
    return dB - dA
  })
  const last = sorted.slice(0, expanded ? 15 : 5)

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h3>
        Recent Request History (Last {expanded ? 15 : 5})
        {sorted.length > 5 && (
          <button
            className="chip"
            style={{ marginLeft: 8 }}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </h3>
      {last.length === 0 ? (
        <div>No recent requests.</div>
      ) : (
        <table className="table recent-request-history">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Scan Type</th>
              <th>Outcome</th>
              <th>Feedback</th>
              <th>Indication</th>
              <th>Clinical info</th>
            </tr>
          </thead>
          <tbody>
            {last.map((r) => {
              const feedback = r.reason?.trim()
              return (
                <tr key={r.id} className={outcomeClass(r.outcome)}>
                  <td>{formatDate(r.created_at)}</td>
                  <td>{r.scan_type || '—'}</td>
                  <td>{formatOutcome(r.outcome)}</td>
                  <td title={feedback}>{feedback || '—'}</td>
                  <td style={{ textAlign:'center' }}>{formatSigFig(r.request_appropriateness)}</td>
                  <td style={{ textAlign:'center' }}>{formatSigFig(r.request_quality)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
