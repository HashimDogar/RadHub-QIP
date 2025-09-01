import React from 'react'
import PieChart, { PIE_COLORS } from './PieChart'
import RecentRequestHistory from './RecentRequestHistory'
import LineGraph from './LineGraph'
import InfoButton from './InfoButton'

export default function SummaryCard({ stats, score, requests = [], showOverrides=false, showLegend=true, style, rankings={} }) {
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

  // build data for line graph from last 15 requests
  const lastRequests = [...requests]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-15)
  const totalChange = lastRequests.reduce((sum, r) => sum + (r.points_change || 0), 0)
  let runningScore = cappedScore - totalChange
  const reqScoreSeries = []
  const qualitySeries = []
  const apprSeries = []
  for (const r of lastRequests) {
    runningScore += r.points_change || 0
    const q = r.request_quality != null ? r.request_quality : 0
    const a = r.request_appropriateness != null ? r.request_appropriateness : 0
    const base = (q + a) / 2
    const rs = Math.max(
      0,
      Math.min(10, base + (Math.max(0, Math.min(runningScore, 1000)) / 1000) * (10 - base))
    )
    reqScoreSeries.push(rs)
    qualitySeries.push(q)
    apprSeries.push(a)
  }

  return (
    <>
      <section className="card" style={style}>
        <h3>Summary</h3>
        <div className="summary-container">
          <div className="summary-scores" style={{display:"flex", flexDirection: "column" ,justifyContent: "flex-end", margin: 20}}>
            <div style ={{margin: 10, display:"flex", flexDirection:"column", border: "2px", borderRadius: "10px", padding:5, backgroundColor: "#DEBB00"}}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>Overall Rating</span>
                <InfoButton text="R = baseAvg + (T/1000) * (10 - baseAvg), where baseAvg is the average of clinical information and request indication ratings and T is the request points capped between 0 and 1000." />
              </div>
              <strong style={{fontSize: 20}}>{requestorScoreDisplay}</strong>
              {rankings?.hospital && (
                <div style={{ fontSize: 12 }}>
                  Hospital rank: {rankings.hospital.rank} of {rankings.hospital.total}
                </div>
              )}
              {rankings?.department && (
                <div style={{ fontSize: 12 }}>
                  Department rank: {rankings.department.rank} of {rankings.department.total}
                </div>
              )}
            </div>
            <div style ={{margin: 10, display:"flex", flexDirection:"column", padding:5}}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>Clinical Information rating</span>
                <InfoButton text="Average score (1-10). This reflects the quality of information you give when requesting a scan." />
              </div>
              <strong style={{fontSize: 20}}>{qualityAvg}</strong>
            </div>
            <div style ={{margin: 10, display:"flex", flexDirection:"column", padding:5}}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>Clinical Indication rating</span>
                <InfoButton text="Average score (1-10). This reflects the appropriateness of the indication for your request." />
              </div>
              <strong style={{fontSize: 20}}>{appropriatenessAvg}</strong>
            </div>
          </div>
          <div className="summary-linegraph">
          <LineGraph
            series={[reqScoreSeries, qualitySeries, apprSeries]}
            labels={["Overall score", "Quality rating", "Appt rating"]}
          />
          </div>
          <div  className="summary-chart" style={{ flex:'0 0 auto', margin: 20 }}>
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
          <div  className="summary-totals" style={{ minWidth:220, margin: 20 }}> 
            <div>Total requests: <strong>{total}</strong></div>
            <div>Accepted requests: <strong>{accepted}</strong></div>
            <div>Delayed requests: <strong>{delayed}</strong></div>
            <div>Rejected requests: <strong>{rejected}</strong></div>
            {showOverrides && <div>Overrides: <strong>{stats.counts?.override || 0}</strong></div>}
            <div>Request points: <strong>{cappedScore}</strong></div>
          </div>
        </div>
      </section>
      <RecentRequestHistory requests={requests} />
    </>
  )
}
