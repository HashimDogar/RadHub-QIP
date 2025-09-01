
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(bodyParser.json())
app.use(cookieParser())

// DB
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'app.sqlite3')
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL')

// Schema
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gmc TEXT UNIQUE,
  name TEXT,
  hospital TEXT,
  specialty TEXT,
  grade TEXT,
  score INTEGER DEFAULT 500
);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  requester_score_at_request INTEGER,
  requester_specialty_at_request TEXT,
  requester_grade_at_request TEXT,
  requester_hospital_at_request TEXT,
  requester_name_at_request TEXT,
  discussed_with_senior INTEGER,
  scan_type TEXT,
  outcome TEXT,
  points_change INTEGER,
  reason TEXT,
  radiologist_gmc TEXT,
  request_quality INTEGER,
  request_appropriateness INTEGER,
  request_quality_norm REAL,
  request_appropriateness_norm REAL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS radiologists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gmc TEXT UNIQUE,
  name TEXT
);
`)

// migrate for new columns if existing DB
try{ db.exec('ALTER TABLE requests ADD COLUMN request_quality INTEGER') }catch{}
try{ db.exec('ALTER TABLE requests ADD COLUMN request_appropriateness INTEGER') }catch{}
try{ db.exec('ALTER TABLE requests ADD COLUMN request_quality_norm REAL') }catch{}
try{ db.exec('ALTER TABLE requests ADD COLUMN request_appropriateness_norm REAL') }catch{}

function isValidGmc(g){ return /^\d{7}$/.test(String(g||'').trim()) }
function normaliseName(s){ return s ? String(s).replace(/\s+/g,' ').trim() : null }

function withinRaterNorm(gmc, column, raw){
  if(raw == null) return null
  const rows = db.prepare(`SELECT ${column} AS v FROM requests WHERE radiologist_gmc = ? AND ${column} IS NOT NULL`).all(gmc)
  if(rows.length < 2) return raw
  const vals = rows.map(r=>r.v)
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length
  const sd = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length)
  if(sd === 0) return 5
  const z = (raw - mean) / sd
  const norm = Math.max(1, Math.min(10, 5 + z))
  return norm
}

async function lookupGmcName(gmc){
  try{
    const url = `https://www.gmc-uk.org/doctors/${gmc}`
    const r = await fetch(url, { headers: { 'User-Agent':'Mozilla/5.0 (compatible; RadHub-QIP/1.0)' } })
    if(r.ok){
      const html = await r.text()
      const $ = cheerio.load(html)
      let name = $('h1, [itemprop=name]').first().text().trim()
      if (!name) name = $('title').text().split('|')[0].trim()
      name = normaliseName(name)
      if (name && /^[A-Za-z\-\'\s\.]+$/.test(name)) return name
    }
  }catch{}
  return null
}

// Radiologist access code + GMC (30 min cookies)
const RAD_CODE = process.env.RAD_CODE || '080299'
app.post('/api/v1/rad/unlock', (req, res) => {
  const { code, gmc } = req.body || {}
  if (String(code) !== RAD_CODE) return res.status(401).json({ error:'Invalid code' })
  if (!isValidGmc(gmc)) return res.status(400).json({ error:'Invalid GMC' })
  res.cookie('rad_session','1',{ httpOnly:true, sameSite:'lax', maxAge: 1000*60*30 })
  const clean = String(gmc).trim()
  res.cookie('rad_gmc', clean, { httpOnly:true, sameSite:'lax', maxAge: 1000*60*30 })
  const r = db.prepare('SELECT name FROM radiologists WHERE gmc = ?').get(clean)
  res.json({ ok:true, gmc: clean, name: r?.name || null })
})
app.get('/api/v1/rad/session', (req, res) => {
  const g = req.cookies.rad_gmc
  const active = req.cookies.rad_session === '1' && isValidGmc(g)
  let name = null
  if (active) {
    const r = db.prepare('SELECT name FROM radiologists WHERE gmc = ?').get(g)
    if (r && r.name) name = r.name
  }
  res.json({ active, gmc: active ? g : null, name })
})

app.post('/api/v1/rad/logout', (req, res) => {
  res.clearCookie('rad_session')
  res.clearCookie('rad_gmc')
  res.json({ ok:true })
})

app.get('/api/v1/rad/history', (req, res) => {
  const g = req.cookies.rad_gmc
  const active = req.cookies.rad_session === '1' && isValidGmc(g)
  if (!active) return res.status(401).json({ error: 'Not authorised' })
  const limit = Math.min(50, parseInt(req.query.limit) || 15)
  const rows = db.prepare(`
    SELECT r.created_at,
           u.gmc AS requester_gmc, r.requester_name_at_request AS requester_name,
           r.scan_type, r.outcome,
           r.request_quality AS clinical_information_score,
           r.request_appropriateness AS indication_score,
           r.reason
    FROM requests r
    JOIN users u ON r.user_id = u.id
    WHERE r.radiologist_gmc = ?
    ORDER BY r.id DESC
    LIMIT ?
  `).all(g, limit)
  res.json({ history: rows })
})

// GMC lookup
app.get('/api/v1/gmc/lookup/:gmc', async (req, res)=>{
  const gmc = String(req.params.gmc||'').trim()
  if (!isValidGmc(gmc)) return res.status(400).json({ error:'Invalid GMC' })
  const name = await lookupGmcName(gmc)
  res.json({ gmc, name })
})

// Get user
app.get('/api/v1/user/:gmc', (req, res)=>{
  const gmc = String(req.params.gmc||'').trim()
  if (!isValidGmc(gmc)) return res.status(400).json({ error:'Invalid GMC' })
  const user = db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users WHERE gmc = ?').get(gmc)
  if (!user) return res.status(404).json({ error:'User not recognised' })
  user.score = Math.min(user.score || 0, 1000)
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN outcome='accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN outcome='delayed' THEN 1 ELSE 0 END) AS delayed,
      SUM(CASE WHEN outcome='rejected' THEN 1 ELSE 0 END) AS rejected
    FROM requests WHERE user_id = ?
  `).get(user.id) || { accepted:0, delayed:0, rejected:0 }
  const avgs = db.prepare(`SELECT AVG(COALESCE(request_quality_norm, request_quality)) as avg_quality, AVG(COALESCE(request_appropriateness_norm, request_appropriateness)) as avg_appropriateness FROM requests WHERE user_id = ?`).get(user.id) || { avg_quality: null, avg_appropriateness: null }
  const reqs = db.prepare(`
    SELECT id, created_at, scan_type, outcome, points_change, reason, discussed_with_senior,
           requester_specialty_at_request, requester_grade_at_request, requester_hospital_at_request,
           COALESCE(request_quality_norm, request_quality) AS request_quality,
           COALESCE(request_appropriateness_norm, request_appropriateness) AS request_appropriateness
    FROM requests WHERE user_id = ? ORDER BY id DESC LIMIT 25
  `).all(user.id)
  res.json({ user, stats:{ counts, avg_request_quality: avgs.avg_quality, avg_request_appropriateness: avgs.avg_appropriateness }, requests:reqs })
})

// List users with stats (for audit page)
app.get('/api/v1/users', (req, res) => {
  const rows = db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users').all()
  const users = rows.map(u => {
    const total = db.prepare('SELECT COUNT(*) as c FROM requests WHERE user_id = ?').get(u.id).c || 0
    const accepted = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='accepted'").get(u.id).c || 0
    const delayed = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='delayed'").get(u.id).c || 0
    const rejected = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='rejected'").get(u.id).c || 0
    const avgs =
      db
        .prepare(
          'SELECT AVG(COALESCE(request_quality_norm, request_quality)) as avg_quality, AVG(COALESCE(request_appropriateness_norm, request_appropriateness)) as avg_appropriateness FROM requests WHERE user_id = ?'
        )
        .get(u.id) || { avg_quality: null, avg_appropriateness: null }
    return {
      gmc: u.gmc,
      name: u.name || null,
      hospital: u.hospital || null,
      specialty: u.specialty || null,
      grade: u.grade || null,
      score: Math.min(u.score || 0, 1000),
      total,
      accepted,
      delayed,
      rejected,
      avg_quality: avgs.avg_quality,
      avg_appropriateness: avgs.avg_appropriateness
    }
  })
  res.json({ users })
})

app.get('/api/v1/radiologists', (req, res) => {
  const rows = db.prepare('SELECT id, gmc, name FROM radiologists').all()
  const radiologists = rows.map(r => {
    const total = db.prepare('SELECT COUNT(*) as c FROM requests WHERE radiologist_gmc = ?').get(r.gmc).c || 0
    const accepted = db.prepare("SELECT COUNT(*) as c FROM requests WHERE radiologist_gmc = ? AND outcome='accepted'").get(r.gmc).c || 0
    const delayed = db.prepare("SELECT COUNT(*) as c FROM requests WHERE radiologist_gmc = ? AND outcome='delayed'").get(r.gmc).c || 0
    const rejected = db.prepare("SELECT COUNT(*) as c FROM requests WHERE radiologist_gmc = ? AND outcome='rejected'").get(r.gmc).c || 0
    const info = db.prepare("SELECT COUNT(*) as c FROM requests WHERE radiologist_gmc = ? AND outcome='info_needed'").get(r.gmc).c || 0
    const avgs = db.prepare('SELECT AVG(COALESCE(request_quality_norm, request_quality)) as avg_quality, AVG(COALESCE(request_appropriateness_norm, request_appropriateness)) as avg_appropriateness FROM requests WHERE radiologist_gmc = ?').get(r.gmc) || { avg_quality:null, avg_appropriateness:null }
    return {
      gmc: r.gmc,
      name: r.name || null,
      total,
      accepted,
      delayed,
      rejected,
      info_needed: info,
      avg_quality: avgs.avg_quality,
      avg_appropriateness: avgs.avg_appropriateness
    }
  })
  res.json({ radiologists })
})

// Create/update user
app.post('/api/v1/user/:gmc/update', async (req, res)=>{
  const gmc = String(req.params.gmc||'').trim()
  if (!isValidGmc(gmc)) return res.status(400).json({ error:'Invalid GMC' })
  const { name, hospital, specialty, grade, score } = req.body || {}
  const existing = db.prepare('SELECT id FROM users WHERE gmc = ?').get(gmc)
  if (existing) {
    const parsed = parseInt(score)
    const s = score === undefined || isNaN(parsed) ? null : Math.min(1000, Math.max(0, parsed))
    db.prepare('UPDATE users SET name = COALESCE(?, name), hospital = COALESCE(?, hospital), specialty = COALESCE(?, specialty), grade = COALESCE(?, grade), score = COALESCE(?, score) WHERE gmc = ?')
      .run(name||null, hospital||null, specialty||null, grade||null, s, gmc)
    return res.json({ ok:true, created:false })
  } else {
    const nm = name || await lookupGmcName(gmc)
    const info = db.prepare('INSERT INTO users (gmc, name, hospital, specialty, grade, score) VALUES (?, ?, ?, ?, ?, 500)')
      .run(gmc, nm||null, hospital||null, specialty||null, grade||null)
    return res.json({ ok:true, created:true, id: info.lastInsertRowid })
  }
})

// Delete user and associated requests
app.delete('/api/v1/user/:gmc', (req, res) => {
  const gmc = String(req.params.gmc || '').trim()
  if (!isValidGmc(gmc)) return res.status(400).json({ error: 'Invalid GMC' })
  const user = db.prepare('SELECT id FROM users WHERE gmc = ?').get(gmc)
  if (user) {
    db.prepare('DELETE FROM requests WHERE user_id = ?').run(user.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id)
    return res.json({ ok: true, user: true })
  }
  const rad = db.prepare('SELECT id FROM radiologists WHERE gmc = ?').get(gmc)
  if (rad) {
    db.prepare('DELETE FROM radiologists WHERE id = ?').run(rad.id)
    return res.json({ ok: true, radiologist: true })
  }
  res.status(404).json({ error: 'User not recognised' })
})

// Vet/save
app.post('/api/v1/vet', async (req, res) => {
  try {
    const { requester_gmc, scan_type, outcome, reason, discussed_with_senior, specialty, grade, hospital, name, request_quality, request_appropriateness } = req.body || {}
    const radiologist_gmc = req.cookies.rad_gmc
    const isValid = (v)=>/^\d{7}$/.test(String(v||'').trim())
    if (!isValid(requester_gmc) || !isValid(radiologist_gmc)) return res.status(400).json({ error:'Invalid GMC' })
    if (!scan_type || !outcome) return res.status(400).json({ error:'Missing scan_type or outcome' })
    if (!['accepted','delayed','rejected','info_needed'].includes(outcome)) return res.status(400).json({ error:'Invalid outcome' })

    const pts = outcome==='accepted' ? 1 : outcome==='info_needed' ? -5 : -10
    const rq = (n=>{ n=parseInt(n); return n>=1&&n<=10?n:null })(request_quality)
    const ra = (n=>{ n=parseInt(n); return n>=1&&n<=10?n:null })(request_appropriateness)
    const rqNorm = withinRaterNorm(radiologist_gmc, 'request_quality', rq)
    const raNorm = withinRaterNorm(radiologist_gmc, 'request_appropriateness', ra)

    let rad = db.prepare('SELECT id FROM radiologists WHERE gmc = ?').get(radiologist_gmc)
    if (!rad) {
      const rname = await lookupGmcName(radiologist_gmc)
      db.prepare('INSERT INTO radiologists (gmc, name) VALUES (?, ?)').run(radiologist_gmc, rname || null)
    }

    let user = db.prepare('SELECT * FROM users WHERE gmc = ?').get(requester_gmc)
    if (!user) {
      const nm = name || await lookupGmcName(requester_gmc)
      const info = db.prepare('INSERT INTO users (gmc, name, hospital, specialty, grade, score) VALUES (?, ?, ?, ?, ?, 500)')
        .run(requester_gmc, nm||null, hospital||null, specialty||null, grade||null)
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
    }

    const newScore = Math.min(1000, (user.score||0) + pts)
    db.prepare('UPDATE users SET score = ? WHERE id = ?').run(newScore, user.id)

    const snapSpec = specialty || user.specialty || null
    const snapGrade = grade || user.grade || null
    const snapHosp = hospital || user.hospital || null
    const snapName = name || user.name || null

    db.prepare(`INSERT INTO requests (user_id, requester_score_at_request, requester_specialty_at_request, requester_grade_at_request, requester_hospital_at_request, requester_name_at_request, discussed_with_senior, scan_type, outcome, points_change, reason, radiologist_gmc, request_quality, request_appropriateness, request_quality_norm, request_appropriateness_norm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(user.id, Math.min(user.score||0, 1000), snapSpec, snapGrade, snapHosp, snapName, discussed_with_senior?1:0, scan_type, outcome, pts, reason||null, radiologist_gmc, rq, ra, rqNorm, raNorm)

    res.json({ ok:true, points_change: pts, new_score: newScore })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error:'Save failed' })
  }
})

// Ranking
function computeRankings({ hospital, specialty, metric }){
  let users
  if (hospital && specialty) {
    users = db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users WHERE hospital = ? AND specialty = ?').all(hospital, specialty)
  } else if (hospital) {
    users = db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users WHERE hospital = ?').all(hospital)
  } else if (specialty) {
    users = db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users WHERE specialty = ?').all(specialty)
  } else {
    users = db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users').all()
  }
  const rows = users.map(u=>{
    const total = db.prepare('SELECT COUNT(*) as c FROM requests WHERE user_id = ?').get(u.id).c || 0
    const acc = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='accepted'").get(u.id).c || 0
    const rej = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='rejected'").get(u.id).c || 0
    const del = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='delayed'").get(u.id).c || 0
    const avgs = db.prepare('SELECT AVG(COALESCE(request_quality_norm, request_quality)) as avg_quality, AVG(COALESCE(request_appropriateness_norm, request_appropriateness)) as avg_appropriateness FROM requests WHERE user_id = ?').get(u.id) || { avg_quality:null, avg_appropriateness:null }
    const pct = (n)=> total ? (n/total)*100 : 0
    const cappedScore = Math.min(Math.max(u.score||0,0),1000)
    const baseAvg = ((avgs.avg_quality||0) + (avgs.avg_appropriateness||0)) / 2
    const reqRating = Math.max(0, Math.min(10, baseAvg + (cappedScore/1000)*(10-baseAvg)))
    return { gmc:u.gmc, name:u.name||null, hospital:u.hospital||null, specialty:u.specialty||null, grade:u.grade||null, score:cappedScore, total, pct_accepted:pct(acc), pct_rejected:pct(rej), pct_delayed:pct(del), avg_quality:avgs.avg_quality, avg_appropriateness:avgs.avg_appropriateness, requestor_score_rating:reqRating }
  })
  const key = metric==='score' ? 'requestor_score_rating' : metric
  rows.sort((a,b)=>(b[key]||0)-(a[key]||0))
  rows.forEach((r,i)=>{ r.rank = i+1 })
  return rows
}
function aroundIndex(arr, idx, span=3){ const s=Math.max(0,idx-span); const e=Math.min(arr.length, idx+span+1); return arr.slice(s,e) }
app.get('/api/v1/rank/:metric', (req, res)=>{
  const metricParam = String(req.params.metric||'score')
  const metricMap = { quality:'avg_quality', appropriateness:'avg_appropriateness' }
  const metric = metricMap[metricParam] || metricParam
  const allowed = ['score','pct_accepted','pct_rejected','pct_delayed','avg_quality','avg_appropriateness']
  if (!allowed.includes(metric)) return res.status(400).json({ error:'Invalid metric' })
  const hospital = req.query.hospital ? String(req.query.hospital) : null
  const specialty = req.query.specialty ? String(req.query.specialty) : null
  const gmc = req.query.gmc ? String(req.query.gmc) : null
  const limit = Math.max(1, parseInt(req.query.limit) || 10)
  const rows = computeRankings({ hospital, specialty, metric })
  const total = rows.length
  let idx = -1
  if (gmc) idx = rows.findIndex(r => r.gmc === gmc)
  let out
  if (gmc && idx >= limit) {
    out = rows.slice(0, Math.min(limit, rows.length))
    out.push({ ellipsis:true })
    out.push(...aroundIndex(rows, idx, 2))
  } else {
    const l = gmc ? Math.max(limit, idx+3) : limit
    out = rows.slice(0, Math.min(l, rows.length))
  }
  const percentile = (idx >= 0 && total>0) ? Math.round(((total - idx) / total) * 100) : null
  res.json({ total, rank_index: idx, percentile, metric, rows: out })
})

// Raw CSV
app.get('/api/v1/audit/raw-csv', (req, res)=>{
  const rows = db.prepare(`
    SELECT
      r.id,
      r.user_id,
      r.created_at,
      strftime('%Y-%m-%d', r.created_at) AS date,
      strftime('%H:%M:%S', r.created_at) AS time,
      u.gmc AS requester_gmc,
      r.requester_name_at_request,
      r.requester_grade_at_request,
      r.requester_hospital_at_request,
      r.radiologist_gmc,
      rad.name AS radiologist_name,
      r.scan_type,
      r.request_quality,
      r.request_appropriateness,
      r.request_quality_norm,
      r.request_appropriateness_norm,
      r.outcome,
      r.reason AS feedback,
      r.requester_score_at_request
    FROM requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN radiologists rad ON rad.gmc = r.radiologist_gmc
    ORDER BY r.created_at ASC
  `).all()

  // compute running averages for requester ratings at request time
  const stats = {}
  for (const r of rows) {
    const s = stats[r.user_id] || { qSum:0, qCount:0, aSum:0, aCount:0 }
    const qVal = r.request_quality_norm ?? r.request_quality
    if (qVal != null) { s.qSum += qVal; s.qCount += 1 }
    const aVal = r.request_appropriateness_norm ?? r.request_appropriateness
    if (aVal != null) { s.aSum += aVal; s.aCount += 1 }
    stats[r.user_id] = s
    r.requester_avg_quality_at_request = s.qCount ? s.qSum / s.qCount : null
    r.requester_avg_appropriateness_at_request = s.aCount ? s.aSum / s.aCount : null
    const qAvg = r.requester_avg_quality_at_request ?? 0
    const aAvg = r.requester_avg_appropriateness_at_request ?? 0
    const baseAvg = (qAvg + aAvg) / 2
    const cappedScore = Math.max(0, Math.min(r.requester_score_at_request || 0, 1000))
    r.requester_overall_rating = Math.max(0, Math.min(10, baseAvg + (cappedScore / 1000) * (10 - baseAvg)))
  }

  // output in reverse chronological order
  rows.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))

  let csv = "date,time,requester_gmc,requester_name_at_request,requester_grade_at_request,requester_hospital_at_request,radiologist_gmc,radiologist_name,scan_type,request_quality,request_appropriateness,request_quality_norm,request_appropriateness_norm,outcome,feedback,requester_score_at_request,requester_avg_quality_at_request,requester_avg_appropriateness_at_request,requester_overall_rating\n"
  for(const r of rows){
    const safeFeedback = (r.feedback||'').replaceAll('"','""')
    csv += `${r.date},${r.time},${r.requester_gmc||''},${r.requester_name_at_request||''},${r.requester_grade_at_request||''},${r.requester_hospital_at_request||''},${r.radiologist_gmc||''},${r.radiologist_name||''},${r.scan_type||''},${r.request_quality||''},${r.request_appropriateness||''},${r.request_quality_norm||''},${r.request_appropriateness_norm||''},${r.outcome||''},"${safeFeedback}",${r.requester_score_at_request||''},${r.requester_avg_quality_at_request||''},${r.requester_avg_appropriateness_at_request||''},${r.requester_overall_rating||''}\n`
  }
  res.header('Content-Type','text/csv')
  res.attachment('audit_raw.csv')
  res.send(csv)
})

app.get('/api/v1/audit/trends', (req, res) => {
  const interval = ['day', 'week', 'month'].includes(req.query.interval)
    ? req.query.interval
    : 'day'
  const mode = req.query.mode === 'raw' ? 'raw' : 'norm'
  const fmt = interval === 'week' ? '%Y-%W' : interval === 'month' ? '%Y-%m' : '%Y-%m-%d'
  const qCol = mode === 'raw' ? 'request_quality' : 'request_quality_norm'
  const aCol = mode === 'raw' ? 'request_appropriateness' : 'request_appropriateness_norm'
  const defaultLimit = interval === 'week' ? 5 : interval === 'month' ? 12 : 30
  const limit = parseInt(req.query.limit, 10) || defaultLimit
  const page = Math.max(parseInt(req.query.page, 10) || 0, 0)
  const maxPeriods = limit * (page + 1)
  const offset = page * limit
  const base = interval === 'week'
    ? "date('now','weekday 1','-7 days')"
    : interval === 'month'
    ? "date('now','start of month')"
    : "date('now')"
  const step = interval === 'week' ? '-7 day' : interval === 'month' ? '-1 month' : '-1 day'
  const rows = db
    .prepare(`
      WITH RECURSIVE periods(idx, dt) AS (
        SELECT 0, ${base}
        UNION ALL
        SELECT idx+1, date(dt, '${step}')
        FROM periods
        WHERE idx+1 < ?
      )
      SELECT p.period AS period,
             COALESCE(r.requests, 0) AS requests,
             r.avg_quality,
             r.avg_appropriateness
      FROM (
        SELECT idx, strftime('${fmt}', dt) AS period
        FROM periods
        WHERE idx >= ?
        ORDER BY dt
      ) p
      LEFT JOIN (
        SELECT strftime('${fmt}', created_at) AS period,
               COUNT(*) AS requests,
               AVG(${qCol}) AS avg_quality,
               AVG(${aCol}) AS avg_appropriateness
        FROM requests
        GROUP BY period
      ) r ON r.period = p.period
      ORDER BY p.period`
    )
    .all(maxPeriods, offset)

  const earliest = db
    .prepare(`SELECT strftime('${fmt}', MIN(created_at)) AS period FROM requests`)
    .get().period
  const hasMore = earliest != null && earliest < rows[0].period
  res.json({ rows, hasMore })
})

app.listen(PORT, ()=>console.log(`Backend running on http://localhost:${PORT}; DB=${DB_FILE}`))
