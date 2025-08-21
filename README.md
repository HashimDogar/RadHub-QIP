# OOH CT Vetting — QI MVP (Full Stack)

This is a minimal, working prototype you can run locally to pilot your audit/QI intervention.
It tracks OOH CT vetting outcomes by requester GMC, applies your scoring, and shows a simple dashboard.

> **Important:** MVP stores **no patient identifiers**. Outcomes are tied to a requester GMC and scan type only.

## Features
- Radiologist page: enter requester GMC, select scan type, record outcome (Accept/Delay/Reject/Override).
- Scoring: +5 accepted, –5 delayed, –10 rejected, 0 for override.
- Requester dashboard: score, pie chart of accepted/delayed/rejected (override excluded from %), raw counts.
- Simple signup flow binding NHS email to GMC using a dev-only token (email sending omitted for pilot).
- SQLite DB auto-created. No external services required.

## Quick Start

### 1) Backend
```bash
cd backend
cp .env.sample .env
npm install
npm run dev
```

### 2) Frontend
Open a new terminal:
```bash
cd frontend
cp .env.sample .env
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080

## Data Model
- **users**: id, gmc (unique), name (optional), nhs_email (optional), score (default 500)
- **requests**: id, user_id, radiologist_gmc, scan_type, outcome, points_change, reason, created_at
- **email_tokens**: id, user_id, nhs_email, token, used

## Notes for QI Pilot
- Keep scan type as a dropdown (generic). Avoid free text clinical details.
- Overrides are shown separately to radiologists but are **not included** in requester % breakdown (as discussed).
- For governance, register as a local audit/QI project and note that no patient data is stored.

## Hardening for Production (later)
- Replace dev token flow with NHS Identity / NHSmail verification.
- Add role-based auth and radiologist login.
- Add rate limiting, request validation, logging to file, and structured audit exports.
- Host on NHS-approved cloud and complete DSPT + Cyber Essentials Plus.


## Audit page
- Navigate to **/audit** and enter PIN **221199** to unlock exports.
- You can set a date range or click **Last 30 days** for quick filters.
- The **All Requests** CSV includes `requester_score_at_request` and `radiologist_gmc`.
