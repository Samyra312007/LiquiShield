import pandas as pd
import logging
from prophet import Prophet
from typing import List, Dict

logging.getLogger("cmdstanpy").setLevel(logging.ERROR)


def generate_prophet_forecast(
    dates: List[str],
    cash: List[float],
    drain_factor: float,
    safety_threshold: float,
    forecast_days: int = 30,
) -> Dict:
    """
    Train Prophet on historical data, apply crisis shock, return 30-day forecast.
    """
    df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": cash}).dropna()

    if len(df) < 14:
        return _fallback_forecast(df, drain_factor, safety_threshold, forecast_days)

    model = Prophet(
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=forecast_days)
    forecast = model.predict(future)
    future_only = forecast.tail(forecast_days).copy().reset_index(drop=True)

    if drain_factor > 0:
        for day_index in range(forecast_days):
            mult = 1.0 - (drain_factor * (day_index / max(forecast_days - 1, 1)))
            future_only.loc[day_index, "yhat"] *= mult

    will_breach = any(v < safety_threshold for v in future_only["yhat"])

    breach_date = None
    if will_breach:
        breaches = future_only[future_only["yhat"] < safety_threshold]["ds"]
        if not breaches.empty:
            breach_date = breaches.iloc[0].strftime("%Y-%m-%d")

    return {
        "predicted_dates": future_only["ds"].dt.strftime("%Y-%m-%d").tolist(),
        "forecasted_cash": future_only["yhat"].round(2).tolist(),
        "will_breach_minimum": will_breach,
        "breach_date": breach_date,
    }


def _fallback_forecast(
    df: pd.DataFrame, drain_factor: float, safety_threshold: float, forecast_days: int
) -> Dict:
    """Linear decay fallback when Prophet cannot train (too little data)."""
    last_val = float(df["y"].iloc[-1]) if not df.empty else 0.0
    last_date = df["ds"].iloc[-1] if not df.empty else pd.Timestamp.today()

    predicted_dates = []
    forecasted_cash = []
    current = last_val

    for i in range(forecast_days):
        d = last_date + pd.Timedelta(days=i + 1)
        decay = drain_factor * (i / max(forecast_days - 1, 1))
        current = max(0, current * (1 - decay * 0.1))
        predicted_dates.append(d.strftime("%Y-%m-%d"))
        forecasted_cash.append(round(current, 2))

    will_breach = any(v < safety_threshold for v in forecasted_cash)
    breach_date = None
    if will_breach:
        for i, v in enumerate(forecasted_cash):
            if v < safety_threshold:
                breach_date = predicted_dates[i]
                break

    return {
        "predicted_dates": predicted_dates,
        "forecasted_cash": forecasted_cash,
        "will_breach_minimum": will_breach,
        "breach_date": breach_date,
    }
