import React, { useState, useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { downloadRawCsv, getUsers, getRadiologists, updateUser, deleteUser, getUser, getAuditTrends } from '../lib/api'

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
  const [trendInterval, setTrendInterval] = useState('week')
  const [trendMode, setTrendMode] = useState('norm')
  const [trendData, setTrendData] = useState([])
  const [trendPage, setTrendPage] = useState(0)
  const [trendHasPrev, setTrendHasPrev] = useState(false)
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  function unlock(){ if (pin.trim() === '221199') setOk(true); else alert('Incorrect PIN') }

  useEffect(()=>{ if(ok){ loadUsers(); loadRads(); loadTrends() } }, [ok])

  useEffect(()=>{ if(ok) loadTrends() }, [trendInterval, trendMode, trendPage])

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

  async function loadTrends(){
    const r = await getAuditTrends(trendInterval, trendMode, trendPage)
    setTrendData(r.rows || [])
    setTrendHasPrev(r.hasMore)
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

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    const labels = trendData.map(r => r.period)
    const quality = trendData.map(r => r.avg_quality)
    const appropriateness = trendData.map(r => r.avg_appropriateness)
    const counts = trendData.map(r => r.requests)
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Avg clinical info',
            data: quality,
            borderColor: '#4bc0c0',
            backgroundColor: '#4bc0c0',
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Avg indication',
            data: appropriateness,
            borderColor: '#9966ff',
            backgroundColor: '#9966ff',
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: '# Requests',
            data: counts,
            backgroundColor: 'rgba(255,99,132,0.3)',
            borderColor: '#ff6384',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 10,
            title: { display: true, text: 'Average score' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Requests' }
          }
        }
      }
    })
  }, [trendData])

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
      <a className="chip" href={url} download>Download raw CSV</a>

      <div style={{ marginTop:'2rem' }}>
        <h3>Request and rating trends</h3>
        <div className="row">
          <div style={{ minWidth:150 }}>
            <label>Score type</label>
            <select value={trendMode} onChange={e=>{ setTrendMode(e.target.value); setTrendPage(0) }}>
              <option value="raw">Raw</option>
              <option value="norm">Normalised</option>
            </select>
          </div>
          <div style={{ minWidth:150 }}>
            <label>Interval</label>
            <select value={trendInterval} onChange={e=>{ setTrendInterval(e.target.value); setTrendPage(0) }}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:'8px', alignSelf:'flex-end', marginLeft:'auto' }}>
            <button onClick={()=>setTrendPage(p=>p+1)} disabled={!trendHasPrev}>Prev</button>
            <button onClick={()=>setTrendPage(p=>Math.max(0,p-1))} disabled={trendPage===0}>Next</button>
          </div>
        </div>
        <div style={{ marginTop:'1rem' }}>
          <canvas ref={canvasRef} style={{ maxHeight:400 }} />
        </div>
      </div>

      <div style={{ marginTop:'2rem' }}>
        <h3>Registered Users</h3>
        <div style={{ overflowX:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>GMC</th>
                <th>Name</th>
                <th>Hospital</th>
                <th>Specialty</th>
                <th>Grade</th>
                <th style={{ textAlign: 'center' }}>Request points</th>
                <th style={{ textAlign: 'center' }}>Info rating</th>
                <th style={{ textAlign: 'center' }}>Indication rating</th>
                <th style={{ textAlign: 'center' }}>Quality score</th>
                <th>Total</th>
                <th style={{ textAlign: 'center' }}>Accepted</th>
                <th style={{ textAlign: 'center' }}>Delayed</th>
                <th style={{ textAlign: 'center' }}>Rejected</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const qn = u.avg_quality || 0
                const an = u.avg_appropriateness || 0
                const qAvg = qn.toFixed(1)
                const aAvg = an.toFixed(1)
                const cappedScore = Math.max(0, Math.min(u.score || 0, 1000))
                const baseAvg = (qn + an) / 2
                const reqScore = Math.max(
                  0,
                  Math.min(10, baseAvg + (cappedScore / 1000) * (10 - baseAvg))
                ).toFixed(1)
                return (
                  <tr key={u.gmc}>
                    <td style={{ textAlign: 'center' }}>{u.gmc}</td>
                    <td>{u.name || '-'}</td>
                    <td>{u.hospital || '-'}</td>
                    <td>{u.specialty || '-'}</td>
                    <td>{u.grade || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{u.score}</td>
                    <td style={{ textAlign: 'center' }}>{qAvg}</td>
                    <td style={{ textAlign: 'center' }}>{aAvg}</td>
                    <td style={{ textAlign: 'center' }}>{reqScore}</td>
                    <td>{u.total}</td>
                    <td style={{ textAlign: 'center' }}>{u.accepted}</td>
                    <td style={{ textAlign: 'center' }}>{u.delayed}</td>
                    <td style={{ textAlign: 'center' }}>{u.rejected}</td>
                  </tr>
                )
              })}
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
                <th style={{ textAlign: 'center' }}>GMC</th>
                <th>Name</th>
                <th style={{ textAlign: 'center' }}>Requests Vetted</th>
                <th style={{ textAlign: 'center' }}>Accepted</th>
                <th style={{ textAlign: 'center' }}>Delayed</th>
                <th style={{ textAlign: 'center' }}>Rejected</th>
                <th style={{ textAlign: 'center' }}>More Info</th>
                <th style={{ textAlign: 'center' }}>Avg Indication</th>
                <th style={{ textAlign: 'center' }}>Avg Info</th>
              </tr>
            </thead>
            <tbody>
              {rads.map(r => (
                <tr key={r.gmc}>
                  <td style={{ textAlign: 'center' }}>{r.gmc}</td>
                  <td>{r.name || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{r.total}</td>
                  <td style={{ textAlign: 'center' }}>{r.accepted}</td>
                  <td style={{ textAlign: 'center' }}>{r.delayed}</td>
                  <td style={{ textAlign: 'center' }}>{r.rejected}</td>
                  <td style={{ textAlign: 'center' }}>{r.info_needed}</td>
                  <td style={{ textAlign: 'center' }}>
                    {r.avg_appropriateness != null ? r.avg_appropriateness.toFixed(2) : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {r.avg_quality != null ? r.avg_quality.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
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
