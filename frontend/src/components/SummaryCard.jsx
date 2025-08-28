import React from 'react'
import PieChart, { PIE_COLORS } from './PieChart'

export default function SummaryCard({ stats, score, showOverrides=false, showLegend=true, style }) {
  if (!stats) return null
  const accepted = (stats.counts?.accepted || 0) + (stats.counts?.override || 0)
  const delayed = stats.counts?.delayed || 0
  const rejected = stats.counts?.rejected || 0
  const total = accepted + delayed + rejected
  const qualityAvg = stats.avg_request_quality ? stats.avg_request_quality.toFixed(1) : '0.0'
  const appropriatenessAvg = stats.avg_request_appropriateness ? stats.avg_request_appropriateness.toFixed(1) : '0.0'
  return (
    <section className="card" style={style}>
      <h3>Summary</h3>
      <div className="row" style={{ alignItems:'center', gap:20 }}>
        <div style={{ flex:'0 0 auto' }}>
          <PieChart data={[
            { label:'Accepted', value: accepted },
            { label:'Delayed', value: delayed },
            { label:'Rejected', value: rejected }
          ]} />
          {showLegend && (
            <div style={{ display:'flex', justifyContent:'center', marginTop:8, gap:8, fontSize:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:PIE_COLORS[0], display:'inline-block' }}></span>Accepted</div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:PIE_COLORS[1], display:'inline-block' }}></span>Delayed</div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:PIE_COLORS[2], display:'inline-block' }}></span>Rejected</div>
            </div>
          )}
        </div>
        <div style={{ minWidth:220 }}>
          <div>Total requests: <strong>{total}</strong></div>
          <div>Accepted requests: <strong>{accepted}</strong></div>
          <div>Delayed requests: <strong>{delayed}</strong></div>
          <div>Rejected requests: <strong>{rejected}</strong></div>
          {showOverrides && <div>Overrides: <strong>{stats.counts?.override || 0}</strong></div>}
          <div>Total score: <strong>{score}</strong></div>
          <div>Request quality score: <strong>{qualityAvg}</strong></div>
          <div>Request appropriateness score: <strong>{appropriatenessAvg}</strong></div>
        </div>
      </div>
    </section>
  )
}
