
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
  score INTEGER DEFAULT 1000
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
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`)

// migrate for new columns if existing DB
try{ db.exec('ALTER TABLE requests ADD COLUMN request_quality INTEGER') }catch{}
try{ db.exec('ALTER TABLE requests ADD COLUMN request_appropriateness INTEGER') }catch{}

function isValidGmc(g){ return /^\d{7}$/.test(String(g||'').trim()) }
function normaliseName(s){ return s ? String(s).replace(/\s+/g,' ').trim() : null }

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

// Radiologist access code (30 min cookie)
const RAD_CODE = process.env.RAD_CODE || '080299'
app.post('/api/v1/rad/unlock', (req, res) => {
  const { code } = req.body || {}
  if (String(code) === RAD_CODE) {
    res.cookie('rad_session','1',{ httpOnly:true, sameSite:'lax', maxAge: 1000*60*30 })
    return res.json({ ok:true })
  }
  res.status(401).json({ error:'Invalid code' })
})
app.get('/api/v1/rad/session', (req, res) => { res.json({ active: req.cookies.rad_session === '1' }) })

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
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN outcome='accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN outcome='delayed' THEN 1 ELSE 0 END) AS delayed,
      SUM(CASE WHEN outcome='rejected' THEN 1 ELSE 0 END) AS rejected
    FROM requests WHERE user_id = ?
  `).get(user.id) || { accepted:0, delayed:0, rejected:0 }
  const avgs = db.prepare(`SELECT AVG(request_quality) as avg_quality, AVG(request_appropriateness) as avg_appropriateness FROM requests WHERE user_id = ?`).get(user.id) || { avg_quality: null, avg_appropriateness: null }
  const reqs = db.prepare(`
    SELECT id, created_at, scan_type, outcome, points_change, reason, discussed_with_senior,
           requester_specialty_at_request, requester_grade_at_request, requester_hospital_at_request
    FROM requests WHERE user_id = ? ORDER BY id DESC LIMIT 25
  `).all(user.id)
  res.json({ user, stats:{ counts, avg_request_quality: avgs.avg_quality, avg_request_appropriateness: avgs.avg_appropriateness }, requests:reqs })
})

// Create/update user
app.post('/api/v1/user/:gmc/update', async (req, res)=>{
  const gmc = String(req.params.gmc||'').trim()
  if (!isValidGmc(gmc)) return res.status(400).json({ error:'Invalid GMC' })
  const { name, hospital, specialty, grade } = req.body || {}
  const existing = db.prepare('SELECT id FROM users WHERE gmc = ?').get(gmc)
  if (existing) {
    db.prepare('UPDATE users SET name = COALESCE(?, name), hospital = COALESCE(?, hospital), specialty = COALESCE(?, specialty), grade = COALESCE(?, grade) WHERE gmc = ?')
      .run(name||null, hospital||null, specialty||null, grade||null, gmc)
    return res.json({ ok:true, created:false })
  } else {
    const nm = name || await lookupGmcName(gmc)
    const info = db.prepare('INSERT INTO users (gmc, name, hospital, specialty, grade, score) VALUES (?, ?, ?, ?, ?, 1000)')
      .run(gmc, nm||null, hospital||null, specialty||null, grade||null)
    return res.json({ ok:true, created:true, id: info.lastInsertRowid })
  }
})

// Vet/save
app.post('/api/v1/vet', async (req, res) => {
  try {
    const { requester_gmc, radiologist_gmc, scan_type, outcome, reason, discussed_with_senior, specialty, grade, hospital, name, request_quality, request_appropriateness } = req.body || {}
    const isValid = (v)=>/^\d{7}$/.test(String(v||'').trim())
    if (!isValid(requester_gmc) || !isValid(radiologist_gmc)) return res.status(400).json({ error:'Invalid GMC' })
    if (!scan_type || !outcome) return res.status(400).json({ error:'Missing scan_type or outcome' })
    if (!['accepted','delayed','rejected'].includes(outcome)) return res.status(400).json({ error:'Invalid outcome' })

    const pts = outcome==='accepted' ? 5 : outcome==='delayed' ? -5 : -10
    const rq = (n=>{ n=parseInt(n); return n>=1&&n<=10?n:null })(request_quality)
    const ra = (n=>{ n=parseInt(n); return n>=1&&n<=10?n:null })(request_appropriateness)

    let user = db.prepare('SELECT * FROM users WHERE gmc = ?').get(requester_gmc)
    if (!user) {
      const nm = name || await lookupGmcName(requester_gmc)
      const info = db.prepare('INSERT INTO users (gmc, name, hospital, specialty, grade, score) VALUES (?, ?, ?, ?, ?, 1000)')
        .run(requester_gmc, nm||null, hospital||null, specialty||null, grade||null)
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
    }

    const newScore = (user.score||0) + pts
    db.prepare('UPDATE users SET score = ? WHERE id = ?').run(newScore, user.id)

    const snapSpec = specialty || user.specialty || null
    const snapGrade = grade || user.grade || null
    const snapHosp = hospital || user.hospital || null
    const snapName = name || user.name || null

    db.prepare(`INSERT INTO requests (user_id, requester_score_at_request, requester_specialty_at_request, requester_grade_at_request, requester_hospital_at_request, requester_name_at_request, discussed_with_senior, scan_type, outcome, points_change, reason, radiologist_gmc, request_quality, request_appropriateness) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(user.id, user.score||0, snapSpec, snapGrade, snapHosp, snapName, discussed_with_senior?1:0, scan_type, outcome, pts, reason||null, radiologist_gmc, rq, ra)

    res.json({ ok:true, points_change: pts, new_score: newScore })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error:'Save failed' })
  }
})

// Ranking
function computeRankings({ by, value, metric }){
  const users = by && value
    ? db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users WHERE ' + (by==='hospital' ? 'hospital = ?' : 'specialty = ?')).all(value)
    : db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users').all()
  const rows = users.map(u=>{
    const total = db.prepare('SELECT COUNT(*) as c FROM requests WHERE user_id = ?').get(u.id).c || 0
    const acc = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='accepted'").get(u.id).c || 0
    const rej = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='rejected'").get(u.id).c || 0
    const del = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='delayed'").get(u.id).c || 0
    const pct = (n)=> total ? (n/total)*100 : 0
    return { gmc:u.gmc, name:u.name||null, hospital:u.hospital||null, specialty:u.specialty||null, grade:u.grade||null, score:u.score||0, total, pct_accepted:pct(acc), pct_rejected:pct(rej), pct_delayed:pct(del) }
  })
  const key = metric==='score' ? 'score' : metric
  rows.sort((a,b)=>(b[key]||0)-(a[key]||0))
  return rows
}
function aroundIndex(arr, idx, span=3){ const s=Math.max(0,idx-span); const e=Math.min(arr.length, idx+span+1); return arr.slice(s,e) }
app.get('/api/v1/rank/:metric', (req, res)=>{
  const metric = String(req.params.metric||'score')
  if (!['score','pct_accepted','pct_rejected','pct_delayed'].includes(metric)) return res.status(400).json({ error:'Invalid metric' })
  const by = req.query.by ? String(req.query.by) : null
  const value = req.query.value ? String(req.query.value) : null
  const gmc = req.query.gmc ? String(req.query.gmc) : null
  const rows = computeRankings({ by, value, metric })
  const total = rows.length
  let idx = -1
  if (gmc) idx = rows.findIndex(r => r.gmc === gmc)
  const around = idx >= 0 ? aroundIndex(rows, idx, 3) : rows.slice(0, Math.min(7, rows.length))
  const percentile = (idx >= 0 && total>0) ? Math.round(((total - idx) / total) * 100) : null
  res.json({ total, rank_index: idx, percentile, metric, rows: around })
})

// Raw CSV
app.get('/api/v1/audit/raw-csv', (req, res)=>{
  const rows = db.prepare(`
    SELECT r.id, r.created_at, u.gmc AS requester_gmc, r.radiologist_gmc, r.requester_score_at_request,
           r.requester_specialty_at_request, r.requester_grade_at_request, r.requester_hospital_at_request, r.requester_name_at_request,
           r.scan_type, r.outcome, r.points_change, r.reason, r.discussed_with_senior
    FROM requests r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `).all()
  let csv = "id,created_at,requester_gmc,radiologist_gmc,requester_score_at_request,requester_specialty_at_request,requester_grade_at_request,requester_hospital_at_request,requester_name_at_request,scan_type,outcome,points_change,reason,discussed_with_senior\n"
  for(const r of rows){
    const safeReason = (r.reason||'').replaceAll('"','""')
    csv += `${r.id},${r.created_at},${r.requester_gmc},${r.radiologist_gmc},${r.requester_score_at_request},${r.requester_specialty_at_request||''},${r.requester_grade_at_request||''},${r.requester_hospital_at_request||''},${r.requester_name_at_request||''},${r.scan_type},${r.outcome},${r.points_change},"${safeReason}",${r.discussed_with_senior}\n`
  }
  res.header('Content-Type','text/csv')
  res.attachment('audit_raw.csv')
  res.send(csv)
})

app.listen(PORT, ()=>console.log(`Backend running on http://localhost:${PORT}; DB=${DB_FILE}`))
