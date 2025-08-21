# Radiology QI Backend (Express + SQLite)

## Quick start
```bash
cd backend
cp .env.sample .env
npm install
npm run dev
```

- Server runs on `http://localhost:8080`
- Default CORS origin is `http://localhost:5173` (frontend dev server)
- SQLite database at `./data/app.db` will be created automatically.

## API (MVP)
- `GET /api/health` → `{ ok: true }`
- `GET /api/v1/scan-types` → list of allowed scan types
- `POST /api/v1/vet` → body `{ requester_gmc, radiologist_gmc?, scan_type, outcome, reason? }`
- `GET /api/v1/user/:gmc` → dashboard data for a GMC
- `POST /api/v1/signup` → returns magic token for dev; normally you'd email this link
- `GET /api/v1/verify?token=...` → binds NHS email to GMC
