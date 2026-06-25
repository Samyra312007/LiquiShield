# LiquiShield

**AI-driven liquidity stress-testing simulation for global bank risk managers.**

Replace manual, error-prone spreadsheets with real-time Prophet-powered forecasting. Simulate 30-day cash depletion curves during market crises and prevent localized branch failures — all under 3 seconds.

---

## Architecture

```
┌──────────────┐     POST /api/v1/simulate     ┌──────────────┐
│  Next.js     │ ──────────────────────────►   │  FastAPI      │
│  Frontend    │                                │  Backend      │
│  (Vercel)    │ ◄──────────────────────────    │  (Railway)    │
└──────────────┘     JSON ForecastResult        └──────┬───────┘
                                                        │
                                                ┌───────┴───────┐
                                                │  Prophet ML    │
                                                │  Engine        │
                                                └───────┬───────┘
                                                        │
                                                ┌───────┴───────┐
                                                │  AWS Aurora    │
                                                │  PostgreSQL    │
                                                └───────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS, Recharts |
| Backend | Python 3.10+, FastAPI, Uvicorn |
| ML Engine | Facebook Prophet, Pandas, NumPy |
| Database | AWS Aurora PostgreSQL (Serverless) |
| Migrations | Alembic |
| Deployment | Vercel (frontend) / Railway (backend) |

## Project Structure

```
liquishield/
├── backend/
│   ├── main.py                    # FastAPI entrypoint
│   ├── requirements.txt           # Python dependencies
│   ├── seed_data.py               # Database seeder (15 branches, 730 days)
│   ├── alembic.ini                # Alembic migration config
│   ├── alembic/                   # Migration scripts
│   ├── api/
│   │   ├── __init__.py
│   │   └── liquidity_routes.py    # GET /baseline, POST /simulate
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── payloads.py            # Pydantic request/response models
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py          # SQLAlchemy engine + session
│   │   └── models.py              # Branch, DailyLiquidityLog
│   └── ai_engine/
│       ├── __init__.py
│       ├── forecaster.py          # Prophet forecast + shock logic
│       ├── preprocessor.py        # DataFrame preparation
│       ├── pipeline.py            # Moli's API pipeline
│       ├── advanced_pipeline.py   # NLP-enhanced forecasting
│       └── nlp_analyzer.py        # DistilBERT sentiment analysis
├── liquishield-frontend/          # Next.js frontend (separate)
└── .gitignore
```

## API Endpoints

### `GET /api/v1/liquidity/baseline`
Returns current liquidity snapshot for all branches.

**Response:**
```json
{
  "branches": [
    {
      "branch_id": "BR-NYC-001",
      "region": "North America",
      "current_balance": 120000000.00,
      "min_reserve_threshold": 5000000.00,
      "is_flagged": false
    }
  ],
  "total_liquidity": 1008000000.00,
  "total_branches": 15,
  "branches_at_risk": 0
}
```

### `POST /api/v1/liquidity/simulate`
Run a stress-test simulation.

**Request:**
```json
{
  "severity_multiplier": 3.5,
  "forecast_days": 30,
  "regions": ["ALL"]
}
```

**Response:**
```json
{
  "forecasts": [
    {
      "branch_id": "BR-NYC-001",
      "region": "North America",
      "predicted_dates": ["2026-07-25", "2026-07-26", ...],
      "forecasted_cash": [118500000.00, 115200000.00, ...],
      "will_breach_minimum": true,
      "breach_date": "2026-08-15",
      "days_until_zero": 21
    }
  ],
  "execution_time_ms": 1245.32
}
```

## Database Schema

### `branches`
| Column | Type | Description |
|--------|------|-------------|
| branch_id | VARCHAR(50) PK | Unique branch identifier |
| region | VARCHAR(100) | Geographic region |
| country_code | VARCHAR(3) | ISO country code |
| currency | VARCHAR(3) | Base currency |
| min_reserve_threshold | NUMERIC(15,2) | Regulatory minimum |
| current_balance | NUMERIC(15,2) | Latest cash balance |

### `daily_liquidity_logs`
| Column | Type | Description |
|--------|------|-------------|
| log_id | INTEGER PK | Auto-increment ID |
| branch_id | VARCHAR(50) FK | References branches |
| record_date | DATE | Transaction date |
| opening_balance | NUMERIC(15,2) | Day-start balance |
| closing_balance | NUMERIC(15,2) | Day-end balance |
| total_withdrawals | NUMERIC(15,2) | Total outflows |
| total_deposits | NUMERIC(15,2) | Total inflows |

**Index:** `idx_branch_date_lookup` on `(branch_id, record_date DESC)`

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env        # Edit DATABASE_URL
python seed_data.py         # Seed 15 branches x 730 days
uvicorn main:app --reload   # Start at http://localhost:8000
```

### Alembic Migrations

```bash
alembic upgrade head        # Apply pending migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### API Docs

Once running, visit `http://localhost:8000/docs` for Swagger UI.

## Simulation Logic

1. **Pre-trained Baseline**: Prophet fits to 730 days of historical liquidity data per branch
2. **Shock Injection**: `severity_multiplier` (1.0–5.0) maps to `drain_factor` (0.0–1.0). Linear degradation applied to the 30-day forecast: `cash[i] *= 1.0 - (drain_factor * i / 29)`
3. **Breach Detection**: Any branch projected below its `min_reserve_threshold` is flagged red. Results sorted by earliest breach date.

## Non-Functional Requirements

- **Latency**: API response < 3s P95, frontend render < 500ms
- **CORS**: Backend restricts origins to frontend URL
- **Secrets**: `DATABASE_URL` and `JWT_SECRET` via environment variables only
- **Theme**: Dark mode only (`bg-slate-950`), WCAG AA compliant

## Out of Scope

- Real-time banking API integration (uses seeded/mocked data)
- User authentication / multi-tenancy
- Mobile-responsive UI
- Light mode
