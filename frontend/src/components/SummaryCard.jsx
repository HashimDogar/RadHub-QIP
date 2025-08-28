import React from 'react'
import PieChart, { PIE_COLORS } from './PieChart'
import RecentRequestHistory from './RecentRequestHistory'

export default function SummaryCard({ stats, score, showOverrides=false, showLegend=true, style }) {
  if (!stats) return null
  const accepted = (stats.counts?.accepted || 0) + (stats.counts?.override || 0)
  const delayed = stats.counts?.delayed || 0
  const rejected = stats.counts?.rejected || 0
  const total = accepted + delayed + rejected

  const qualityAvgNum = stats.avg_request_quality || 0
  const appropriatenessAvgNum = stats.avg_request_appropriateness || 0
  const qualityAvg = qualityAvgNum.toFixed(1)
  const appropriatenessAvg = appropriatenessAvgNum.toFixed(1)

  // cap T between 0 and 1000
  const cappedScore = Math.max(0, Math.min(score || 0, 1000))

  // base average of A and Q
  const baseAvg = (qualityAvgNum + appropriatenessAvgNum) / 2

  // R = baseAvg + (T/1000) * (10 - baseAvg), then clamp to [0,10]
  const requestorScore = Math.max(0, Math.min(10, baseAvg + (cappedScore / 1000) * (10 - baseAvg)))
  const requestorScoreDisplay = requestorScore.toFixed(1)

  return (
    <>
      <section className="card" style={style}>
        <h3>Summary</h3>
        <div className="row" style={{ alignItems:'center', gap:20, display: "flex", flexDirection: "row"}}>
          <div style={{display:"flex", flexDirection: "column" ,justifyContent: "flex-end", margin: 20}}>
          <div style ={{margin: 10, display:"flex", flexDirection:"column"}}>Requestor score: <strong style={{fontSize: 20}}>{requestorScoreDisplay}</strong></div>
          <div style ={{margin: 10, display:"flex", flexDirection:"column"}}>Request quality rating: <strong style={{fontSize: 20}}>{qualityAvg}</strong></div>
          <div style ={{margin: 10, display:"flex", flexDirection:"column"}}>Request appropriateness rating: <strong style={{fontSize: 20}}>{appropriatenessAvg}</strong></div>
          </div>
          <div style={{ flex:'0 0 auto', margin: 20 }}>
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
          <div style={{ minWidth:220, margin: 20 }}>
          <div>Total requests: <strong>{total}</strong></div>
          <div>Accepted requests: <strong>{accepted}</strong></div>
          <div>Delayed requests: <strong>{delayed}</strong></div>
          <div>Rejected requests: <strong>{rejected}</strong></div>
          {showOverrides && <div>Overrides: <strong>{stats.counts?.override || 0}</strong></div>}
          <div>Total score: <strong>{cappedScore}</strong></div>
          </div>
        </div>
      </section>
      <RecentRequestHistory />
    </>
  )
}
