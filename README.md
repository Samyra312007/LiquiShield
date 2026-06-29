# 🛡️ LiquiShield

> **AI-Driven Liquidity Stress-Testing & Predictive Analytics for Global Banking**

[🚀 CLICK HERE TO VIEW THE LIVE APPLICATION 🚀](http://your-live-link-here)

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat&logo=python) 
![Framework](https://img.shields.io/badge/FastAPI-Framework-blue?style=flat&logo=fastapi) 
![Stack](https://img.shields.io/badge/Stack-Prophet%20|%20Pandas%20|%20Next.js-blue?style=flat) 
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

**LiquiShield** is an intelligent, operations-focused Decision Support System (DSS) designed to solve the critical challenges of liquidity risk management. This application provides real-time predictive analytics to simulate 30-day cash depletion curves during market crises and prevents localized branch failures.

Demo Video Link: https://youtu.be/ZqHTgd00KTs

---

## 📑 Table of Contents
1. [Problem & Solution](#-problem--solution)
2. [System Interface & Dashboards](#system-interface--dashboards)
3. [Core Architecture & Algorithm](#core-architecture--algorithm)
4. [Key Features & Business Value](#-key-features--business-value)
5. [Technology Stack](#technology-stack)
6. [Directory Structure](#-directory-structure)
7. [API Endpoints](#-api-endpoints)
8. [Database Schema](#database-schema)
9. [Local Installation](#local-installation)
10. [Simulation Logic](#-simulation-logic)
11. [Non-Functional Requirements](#-non-functional-requirements)
12. [Out of Scope](#-out-of-scope)
13. [Future Roadmap](#future-roadmap)
---

## 📖 Problem & Solution

### The Problem: The Speed of Modern Bank Runs
The inspiration for LiquiShield stems from the terrifying speed of modern financial crises. While crises used to unfold over weeks, digital-age bank runs—fueled by social media panic and mobile banking—can drain billions in a single day. Risk managers remain reliant on manual, error-prone spreadsheets to fight these fast-moving threats, leading to dangerous data latency and a lack of granular visibility when failure is imminent.

### The Solution: Proactive, AI-Driven Stress Testing
LiquiShield replaces anxiety and manual spreadsheets with an automated AI command center. We bridge the gap between historical banking data and real-time predictive management by utilizing:
* **Enterprise-Grade AWS Database**: Powered by Amazon Aurora PostgreSQL for high-speed querying during massive data spikes.
* **Sentiment-Aware AI**: A dual-engine approach using Facebook Prophet for baseline forecasting and DistilBERT to translate market panic into mathematical shock multipliers.
* **Automated Alerting**: Turning chaotic financial emergencies into calm, controlled decisions via a clear "Days to Failure" countdown.

---

## System Interface & Dashboards
* **Global Cash Dashboard**: A unified, high-level view of current liquidity across the entire global network.
* **AI Panic Simulator**: Enables managers to test bank run scenarios using custom severity inputs or AI-scanned news data.
* **30-Day Forecast**: Visualizes complex cash depletion timelines during simulated emergency scenarios.
* **The Zero-Hour Alarm**: Provides a clear "Days to Failure" countdown, isolating at-risk branches so managers know exactly where to send emergency funds.

---

## Core Architecture & Algorithm
![LiquiShield Architecture](architecture_diagram.png)

* **Data Layer**: Amazon Aurora PostgreSQL (Serverless) handles high-concurrency data ingestion during simulations.
* **AI Engine**: Python/FastAPI backend integrates Facebook Prophet for time-series forecasting and NLP for sentiment-based shock multipliers.
* **Frontend**: Next.js/React dashboard provides real-time visualization and user-shock input, optimized via Vercel for instant performance.

---

## 💎 Key Features & Business Value
* **Real-Time Forecasting**: Uses historical branch data to project cash flow 30 days into the future.
* **Sentiment-Aware Models**: Translates real-time macroeconomic news into mathematical shock multipliers.
* **Proactive Breach Detection**: Automatically flags branches projected to fall below regulatory minimums.
* **Optimized Latency**: FastAPI backend ensures all simulation results are delivered in under 3 seconds.

---

## Technology Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js, React, Tailwind CSS, Recharts, Vercel |
| **Backend** | Python 3.10+, FastAPI, Docker |
| **ML Engine** | Facebook Prophet, Hugging Face, Pandas,Natural Language Processing, Machine Learning |
| **Database** | Amazon Web Services, Amazon Aurora, PostgreSQL |

---
## 📂 Directory Structure

```
root/
├── backend/
│   ├── ai_engine/
│   │   ├── __init__.py
│   │   ├── advanced_pipeline.py
│   │   ├── forecaster.py
│   │   ├── nlp_analyzer.py
│   │   ├── pipeline.py
│   │   └── preprocessor.py
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 86e17829ec24_initial_sche...
│   │   ├── README
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── api/
│   │   ├── __init__.py
│   │   └── liquidity_routes.py
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py
│   │   └── models.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── payloads.py
│   ├── .env.example
│   ├── alembic.ini
│   ├── main.py
│   ├── requirements.txt
│   └── seed_data.py
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
├── .gitignore
└── AGENTS.md
```

## 📡 API Endpoints

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

## Local Installation

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

### Frontend (liquishield-frontend)

Navigate to the `liquishield-frontend` directory and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

### Alembic Migrations

```bash
alembic upgrade head        # Apply pending migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### API Docs

Once running, visit `http://localhost:8000/docs` for Swagger UI.

## 🧠 Simulation Logic

1. **Pre-trained Baseline**: Prophet fits to 730 days of historical liquidity data per branch
2. **Shock Injection**: `severity_multiplier` (1.0–5.0) maps to `drain_factor` (0.0–1.0). Linear degradation applied to the 30-day forecast: `cash[i] *= 1.0 - (drain_factor * i / 29)`
3. **Breach Detection**: Any branch projected below its `min_reserve_threshold` is flagged red. Results sorted by earliest breach date.

## ⚡ Non-Functional Requirements

- **Latency**: API response < 3s P95, frontend render < 500ms
- **CORS**: Backend restricts origins to frontend URL
- **Secrets**: `DATABASE_URL` and `JWT_SECRET` via environment variables only
- **Theme**: Dark mode only (`bg-slate-950`), WCAG AA compliant

## 🚫 Out of Scope

- Real-time banking API integration (uses seeded/mocked data)
- User authentication / multi-tenancy
- Mobile-responsive UI
- Light mode
## Future Roadmap
- Live Feed Integration: Integrate real-time Bloomberg/social media news.
- Core Banking Integration: Direct connection to live banking systems.
- Automated Alerting: Push notifications via email/SMS.
  
