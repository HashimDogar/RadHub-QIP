// backend/server.js
import express from "express";
import bodyParser from "body-parser";
import Database from "better-sqlite3";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const port = 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const db = new Database("./data/radiology.db");

// Ensure table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    requester_gmc TEXT,
    requester_grade TEXT,
    requester_specialty TEXT,
    requester_score_at_request INTEGER,
    discussed_with_senior INTEGER,
    scan_type TEXT,
    outcome TEXT,
    points_change INTEGER,
    reason TEXT,
    radiologist_gmc TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    gmc TEXT PRIMARY KEY,
    grade TEXT,
    specialty TEXT,
    score INTEGER DEFAULT 1000
  )
`).run();

// Example save request route
app.post("/api/save-request", (req, res) => {
  try {
    const {
      requester_gmc,
      requester_grade,
      requester_specialty,
      requester_score_at_request,
      discussed_with_senior,
      scan_type,
      outcome,
      points_change,
      reason,
      radiologist_gmc,
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO requests (
        requester_gmc, requester_grade, requester_specialty,
        requester_score_at_request, discussed_with_senior,
        scan_type, outcome, points_change, reason, radiologist_gmc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      requester_gmc,
      requester_grade,
      requester_specialty,
      requester_score_at_request,
      discussed_with_senior,
      scan_type,
      outcome,
      points_change,
      reason,
      radiologist_gmc
    );

    res.json({ success: true, message: "Saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audit export
app.get("/api/audit-export", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, created_at, requester_gmc, requester_grade, requester_specialty,
             requester_score_at_request, discussed_with_senior, scan_type,
             outcome, points_change, reason, radiologist_gmc
      FROM requests
      ORDER BY created_at DESC
    `).all();

    let csv = "id,created_at,requester_gmc,requester_grade,requester_specialty,requester_score_at_request,discussed_with_senior,scan_type,outcome,points_change,reason,radiologist_gmc\n";
    rows.forEach(r => {
      csv += `${r.id},${r.created_at},${r.requester_gmc},${r.requester_grade},${r.requester_specialty},${r.requester_score_at_request},${r.discussed_with_senior},${r.scan_type},${r.outcome},${r.points_change},"${r.reason}",${r.radiologist_gmc}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("audit.csv");
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exporting CSV");
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
