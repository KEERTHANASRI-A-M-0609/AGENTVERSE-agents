# ShopMind AI — Demand Prediction Agent

Retail demand forecasting for small shops: ML forecasts, reorder recommendations, and optional Gemini explanations — without burning API quota on every dashboard refresh.

## Quick Start

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

> ⚠️ `.env` is **not included in the repo** (gitignored for security).  
> `copy .env.example .env` creates it — the default key `shopmind_dev_api_key_2025` works out of the box.

Load sample data, then start the API:

```powershell
python -m app.db.load_dataset
python run.py
```

> ⚠️ `shopmind.db` is **not in the repo** — you must run `python -m app.db.load_dataset` first to create it.

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Auth header: `X-API-Key: shopmind_dev_api_key_2025`

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

- UI: http://localhost:5173
- Vite proxies `/api` → `http://127.0.0.1:8000`

### 3. Tests

```powershell
cd backend
pytest
```

## Why am I getting 401 Unauthorized?

Two common causes:

1. **You skipped `copy .env.example .env`** — the backend has no API key configured, so it rejects all requests.
2. **You skipped `python -m app.db.load_dataset`** — the database doesn't exist yet.

Run both commands above and restart the backend.

## Gemini (optional, quota-safe)

By default **`GEMINI_ENABLED=false`**. Dashboard, bulk forecast, and normal predict use **local template explanations only** — no Gemini calls.

To use Gemini for on-demand explanations only:

1. Set `GEMINI_API_KEY` in `backend/.env`
2. Set `GEMINI_ENABLED=true`
3. Click **Explain with AI** in the UI (calls `POST /api/v1/demand/explain`)

Auto-refresh runs every **5 minutes** and never calls Gemini.

## Main APIs

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/demand/predict` | Single product forecast |
| POST | `/api/v1/demand/predict/bulk` | All products |
| GET | `/api/v1/demand/dashboard/{shop_id}` | KPIs, alerts, accuracy, top reorders |
| GET | `/api/v1/demand/trends/{shop_id}` | Trend summary |
| POST | `/api/v1/demand/explain` | Opt-in AI explanation |
| POST | `/api/v1/demand/recommendations/action` | Accept / modify reorder |
| GET | `/api/v1/demand/history/{shop_id}` | Past predictions |
| GET | `/api/v1/health` | DB, model store, Gemini flag |
| GET | `/api/v1/events/stream/{shop_id}` | Live SSE event stream |

Demo shop ID after dataset load: `shop_001`
