import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List

from database.connection import get_db
from database.models import Branch, DailyLiquidityLog
from schemas.payloads import (
    SimulationRequest,
    BranchStatus,
    BaselineResponse,
    ForecastResult,
    SimulateResponse,
)
from ai_engine.forecaster import generate_prophet_forecast

router = APIRouter(prefix="/api/v1/liquidity", tags=["liquidity"])


@router.get("/baseline", response_model=BaselineResponse)
def get_baseline(db: Session = Depends(get_db)):
    branches = db.query(Branch).all()

    branch_statuses = []
    total_liquidity = 0.0
    branches_at_risk = 0

    for b in branches:
        balance = float(b.current_balance or 0)
        threshold = float(b.min_reserve_threshold)
        is_flagged = balance < threshold

        total_liquidity += balance
        if is_flagged:
            branches_at_risk += 1

        branch_statuses.append(
            BranchStatus(
                branch_id=b.branch_id,
                region=b.region,
                country_code=b.country_code,
                currency=b.currency,
                current_balance=balance,
                min_reserve_threshold=threshold,
                is_flagged=is_flagged,
            )
        )

    return BaselineResponse(
        branches=branch_statuses,
        total_liquidity=round(total_liquidity, 2),
        total_branches=len(branch_statuses),
        branches_at_risk=branches_at_risk,
    )


@router.post("/simulate", response_model=SimulateResponse)
def run_simulation(payload: SimulationRequest, db: Session = Depends(get_db)):
    start_time = time.time()

    if payload.severity_multiplier < 1.0 or payload.severity_multiplier > 5.0:
        raise HTTPException(status_code=400, detail="severity_multiplier must be between 1.0 and 5.0")

    branches_query = db.query(Branch)
    if "ALL" not in payload.regions:
        branches_query = branches_query.filter(Branch.region.in_(payload.regions))
    branches = branches_query.all()

    if not branches:
        raise HTTPException(status_code=404, detail="No branches found for the specified regions")

    forecasts = []

    for branch in branches:
        logs = (
            db.query(DailyLiquidityLog)
            .filter(DailyLiquidityLog.branch_id == branch.branch_id)
            .order_by(DailyLiquidityLog.record_date.asc())
            .all()
        )

        if not logs:
            continue

        historical_dates = [log.record_date.strftime("%Y-%m-%d") for log in logs]
        historical_cash = [float(log.closing_balance) for log in logs]

        drain_factor = payload.severity_multiplier / 5.0

        try:
            result = generate_prophet_forecast(
                dates=historical_dates,
                cash=historical_cash,
                drain_factor=drain_factor,
                safety_threshold=float(branch.min_reserve_threshold),
                forecast_days=payload.forecast_days,
            )
            predicted_dates = result["predicted_dates"]
            forecasted_cash = result["forecasted_cash"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Forecasting failed for {branch.branch_id}: {str(e)}")

        min_threshold = float(branch.min_reserve_threshold)
        will_breach = any(c < min_threshold for c in forecasted_cash)

        breach_date = None
        days_until_zero = None
        if will_breach:
            for i, cash_val in enumerate(forecasted_cash):
                if cash_val <= 0:
                    breach_date = predicted_dates[i]
                    days_until_zero = i + 1
                    break
            if breach_date is None:
                for i, cash_val in enumerate(forecasted_cash):
                    if cash_val < min_threshold:
                        breach_date = predicted_dates[i]
                        days_until_zero = i + 1
                        break

        forecasts.append(
            ForecastResult(
                branch_id=branch.branch_id,
                region=branch.region,
                predicted_dates=predicted_dates,
                forecasted_cash=forecasted_cash,
                will_breach_minimum=will_breach,
                breach_date=breach_date,
                days_until_zero=days_until_zero,
            )
        )

    forecasts.sort(key=lambda f: (not f.will_breach_minimum, f.days_until_zero or 9999))

    execution_time = round((time.time() - start_time) * 1000, 2)

    return SimulateResponse(forecasts=forecasts, execution_time_ms=execution_time)
