# ISS Tracker

Local satellite tracking app using **Skyfield + FastAPI** with a **Next.js + Cesium** frontend.

## Features
- Live ISS position (lat/lng/alt/velocity)
- Cesium globe with trajectory line
- Pass finder (lat/lng or address)
- Optional email reminders via Mailgun

## Requirements
- Python 3.11+
- Node.js 18/20+
- Cesium Ion token
- Mailgun account (optional, for email reminders)

## Project Structure
- `App.py` — FastAPI backend
- `orbital_tracker.py` — Skyfield orbital math
- `frontend/` — Next.js app

## Local Setup

### 1) Backend (FastAPI)
From repo root:
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` at repo root:
```
MAILGUN_DOMAIN=
MAILGUN_API_KEY=
MAILGUN_FROM=
DATABASE_PATH=data/satellite.db
EPHEMERIS_PATH=de421.bsp
```

Run the API:
```bash
python -m uvicorn App:app --reload
```

### 2) Frontend (Next.js)
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_CESIUM_ION_TOKEN=YOUR_TOKEN
```

Run the dev server:
```bash
npm run dev -- --webpack
```

Open:
- `http://localhost:3000/live-map`
- `http://localhost:3000/pass-finder`

## API Endpoints
- `POST /current` — current position + trajectory
- `POST /passes` — visible passes for a lat/lng
- `POST /pass-finder` — next visible pass (with optional email)

## Notes / Troubleshooting
- **404 in browser**: Make sure you’re hitting the Next.js server (`localhost:3000`), not FastAPI (`localhost:8000`).
- **Missing Cesium globe**: ensure `NEXT_PUBLIC_CESIUM_ION_TOKEN` is set.
- **Mailgun errors**: make sure your domain is verified and recipients are authorized (sandbox).
- **Timezone**: pass finder uses a numeric UTC offset (hours), not IANA timezone strings.

## Config
Copy `.env.example` to `.env` and fill in your own values/keys.
