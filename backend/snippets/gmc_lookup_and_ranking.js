// ---- Add near the top of server.js ----
// import fetch from 'node-fetch'
// import * as cheerio from 'cheerio'

function normaliseName(s) {
  if (!s) return null;
  return String(s).replace(/\s+/g,' ').trim();
}

// Best-effort GMC lookup
async function lookupGmcName(gmc) {
  try {
    const url = `https://www.gmc-uk.org/doctors/${gmc}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadHub-QIP/1.0)' } });
    if (r.ok) {
      const html = await r.text();
      const $ = cheerio.load(html);
      let name = $('h1, [itemprop=name]').first().text().trim();
      if (!name) name = $('title').text().split('|')[0].trim();
      name = normaliseName(name);
      if (name && /^[A-Za-z\-\'\s\.]+$/.test(name)) return name;
    }
  } catch {}
  return null;
}

// ---- Runtime migrations ----
try { db.prepare("ALTER TABLE users ADD COLUMN name TEXT").run() } catch(e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN hospital TEXT").run() } catch(e) {}
try { db.prepare("ALTER TABLE requests ADD COLUMN requester_name_at_request TEXT").run() } catch(e) {}
try { db.prepare("ALTER TABLE requests ADD COLUMN requester_hospital_at_request TEXT").run() } catch(e) {}

// ---- Endpoint: GMC lookup ----
app.get('/api/v1/gmc/lookup/:gmc', async (req, res) => {
  const gmc = String(req.params.gmc||'').trim();
  if (!isValidGmc(gmc)) return res.status(400).json({ error: 'Invalid GMC' });
  const name = await lookupGmcName(gmc);
  res.json({ gmc, name });
});

// ---- In vet endpoint: when inserting request, snapshot name/hospital ----
// ...INSERT INTO requests (..., requester_name_at_request, requester_hospital_at_request) VALUES (..., ?, ?)
// .run(..., user.name || null, user.hospital || null)

// ---- Update /user/:gmc/update to accept name and hospital ----
// const { specialty, grade, hospital, name } = req.body || {}
// INSERT: (gmc, score, specialty, grade, hospital, name) VALUES (?, 500, ?, ?, ?, ?)
// UPDATE: specialty = COALESCE(?, specialty), grade = COALESCE(?, grade), hospital = COALESCE(?, hospital), name = COALESCE(?, name)

// ---- Ranking endpoints ----
function computeRankings({ by, value, metric }) {
  const users = by && value
    ? db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users WHERE ' + (by==='hospital' ? 'hospital = ?' : 'specialty = ?')).all(value)
    : db.prepare('SELECT id, gmc, name, hospital, specialty, grade, score FROM users').all();
  const rows = users.map(u => {
    const total = db.prepare('SELECT COUNT(*) as c FROM requests WHERE user_id = ?').get(u.id).c || 0;
    const acc = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='accepted'").get(u.id).c || 0;
    const rej = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='rejected'").get(u.id).c || 0;
    const del = db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND outcome='delayed'").get(u.id).c || 0;
    const pct = (n) => total ? (n/total)*100 : 0;
    return {
      gmc: u.gmc, name: u.name || null, hospital: u.hospital || null, specialty: u.specialty || null, grade: u.grade || null,
      score: u.score || 0, total, pct_accepted: pct(acc), pct_rejected: pct(rej), pct_delayed: pct(del)
    };
  });
  let key = metric === 'score' ? 'score' : metric;
  rows.sort((a,b) => (b[key]||0) - (a[key]||0));
  return rows;
}

function aroundIndex(arr, idx, span=3) {
  const start = Math.max(0, idx - span);
  const end = Math.min(arr.length, idx + span + 1);
  return arr.slice(start, end);
}

app.get('/api/v1/rank/:metric', (req, res) => {
  const metric = String(req.params.metric||'score');
  if (!['score','pct_accepted','pct_rejected','pct_delayed'].includes(metric)) return res.status(400).json({ error: 'Invalid metric' });
  const by = req.query.by ? String(req.query.by) : null;
  const value = req.query.value ? String(req.query.value) : null;
  const gmc = req.query.gmc ? String(req.query.gmc) : null;
  const rows = computeRankings({ by, value, metric });
  const total = rows.length;
  let idx = -1;
  if (gmc) idx = rows.findIndex(r => r.gmc === gmc);
  const around = idx >= 0 ? aroundIndex(rows, idx, 3) : rows.slice(0, Math.min(7, rows.length));
  const percentile = (idx >= 0 && total>0) ? Math.round(((total - idx) / total) * 100) : null;
  res.json({ total, rank_index: idx, percentile, metric, rows: around });
});

// ---- CSV export: include snapshots ----
// requester_specialty_at_request, requester_grade_at_request, requester_hospital_at_request, requester_name_at_request
