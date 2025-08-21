# Radiology QI Frontend (Vite + React)

## Quick start
```bash
cd frontend
cp .env.sample .env
npm install
npm run dev
```

- Dev server: `http://localhost:5173`
- Ensure backend is running on `http://localhost:8080` or update `VITE_API_URL`.


---
### Node compatibility
If you are on Node <18, this frontend is pinned to **Vite v4** which runs on Node >=14.18.
If you upgrade Node to 18 or 20 LTS, you can bump Vite back to v5 if you prefer.
