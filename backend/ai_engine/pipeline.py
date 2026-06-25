import pandas as pd
from prophet import Prophet
import json

def run_liquishield_pipeline(api_payload: dict) -> dict:
    """
    The Master API Bridge.
    Receives Sahil's payload, runs the AI, applies shocks, and returns the ForecastResult.
    """
    print("🚀 Initiating LiquiShield API Pipeline...")

    # --- 1. Extract data from Sahil's incoming payload ---
    dates = api_payload.get("historical_dates", [])
    cash = api_payload.get("historical_cash", [])
    retail_shock = api_payload.get("retail_runoff_rate", 0.0)
    corp_shock = api_payload.get("corporate_runoff_rate", 0.0)

    # --- 2. Convert to Prophet's required DataFrame format ---
    df = pd.DataFrame({
        'ds': pd.to_datetime(dates),
        'y': cash
    })

    # --- 3. Train the AI Model ---
    print("🧠 Training predictive weights on incoming branch data...")
    # Suppress the Prophet logs to keep the server console clean
    import logging
    logging.getLogger('cmdstanpy').setLevel(logging.ERROR)
    
    model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    model.fit(df)

    # --- 4. Generate 30-Day Forecast ---
    future_dates = model.make_future_dataframe(periods=30)
    forecast = model.predict(future_dates)
    
    # Isolate only the future 30 days
    future_only = forecast.tail(30).copy().reset_index(drop=True)

    # --- 5. Apply the Scenario Shocks (Day 5 Math) ---
    total_drain_factor = retail_shock + corp_shock
    if total_drain_factor > 0:
        print(f"⚠️ Applying API Stress Shock: {total_drain_factor*100}% Total Drain")
        for day_index in range(30):
            daily_shock_multiplier = 1.0 - (total_drain_factor * (day_index / 29))
            future_only.loc[day_index, 'yhat'] *= daily_shock_multiplier

    # --- 6. Calculate Breaches (Safety Threshold) ---
    # Let's assume the bank branch breaches safety regulations if cash drops below 70 Crores
    safety_threshold = 70.0
    breach_dates = future_only[future_only['yhat'] < safety_threshold]['ds']

    will_breach = len(breach_dates) > 0
    # Grab the very first date they drop below the safety limit
    breach_date_str = breach_dates.iloc[0].strftime('%Y-%m-%d') if will_breach else None

    # --- 7. Package into the exact ForecastResult Schema ---
    response = {
        "predicted_dates": future_only['ds'].dt.strftime('%Y-%m-%d').tolist(),
        "forecasted_cash": future_only['yhat'].round(2).tolist(),
        "will_breach_minimum": will_breach,
        "breach_date": breach_date_str
    }

    print("✅ Pipeline execution complete. Handing data back to FastAPI!")
    return response
if __name__ == "__main__":
    df = pd.read_csv("../liquidity_data.csv")
    mock_sahil_payload = {
        "branch_id": "BR-101",
        "tenant_id": "HDFC-MAIN",
        "historical_dates": df['ds'].astype(str).tolist(),
        "historical_cash": df['y'].tolist(),
        "retail_runoff_rate": 0.25,      
        "corporate_runoff_rate": 0.15    
    }
    final_output = run_liquishield_pipeline(mock_sahil_payload)
    print("\n📦 FINAL JSON PAYLOAD FOR FRONTEND:")
    print(json.dumps(final_output, indent=2))