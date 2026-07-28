<<<<<<< HEAD
# ShopMind AI — Demand Prediction Agent

Retail demand forecasting for small shops: ML forecasts, reorder recommendations, and optional Gemini explanations — without burning API quota on every dashboard refresh.

## Quick start

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Load sample sales data, then start the API:

```powershell
python -m app.db.load_dataset
python run.py
```

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
| POST | `/api/v1/demand/predict` | Single product forecast (`include_ai` defaults false) |
| POST | `/api/v1/demand/predict/bulk` | All products (local explanations) |
| GET | `/api/v1/demand/dashboard/{shop_id}` | KPIs, alerts, accuracy, top reorders |
| GET | `/api/v1/demand/trends/{shop_id}` | Trend summary |
| POST | `/api/v1/demand/explain` | Opt-in AI explanation |
| POST | `/api/v1/demand/recommendations/action` | Accept / modify reorder |
| GET | `/api/v1/demand/history/{shop_id}` | Past predictions |
| GET | `/api/v1/health` | DB, model store, Gemini flag, last prediction |

Demo shop ID after dataset load: `shop_001`.
=======
# AGENTVERSE-agents
>>>>>>> 28962d34bc33b86a63dd6cc021b453c29189d187
