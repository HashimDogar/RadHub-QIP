import React from 'react'

function formatDate(dateString) {
  if (!dateString) return '—'
  const iso = dateString.replace(' ', 'T') + 'Z'
  const parsed = new Date(iso)
  if (isNaN(parsed.getTime())) return dateString
  return parsed.toLocaleString()
}

export default function RecentRequestHistory({ requests = [] }) {
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h3>Recent Request History</h3>
      {requests.length === 0 ? (
        <div>No recent requests.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Scan Type</th>
              <th>Outcome</th>
              <th>Feedback</th>
              <th>Appropriateness</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.created_at)}</td>
                <td>{r.scan_type || '—'}</td>
                <td>{r.outcome || '—'}</td>
                <td>{r.reason?.trim() ? r.reason : '—'}</td>
                <td>{r.request_appropriateness != null ? r.request_appropriateness : '—'}</td>
                <td>{r.request_quality != null ? r.request_quality : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
