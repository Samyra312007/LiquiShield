import pandas as pd
from prophet import Prophet
import json
import logging
import os
from nlp_analyzer import calculate_news_shock

def run_advanced_nlp_pipeline(api_payload: dict) -> dict:
    """
    Advanced Hybrid API Gateway.
    Chains Deep Learning text processing directly into statistical time-series prediction.
    """
    print("🚀 Initializing Advanced NLP-Prophet Core Logic...")
    
    dates = api_payload.get("historical_dates", [])
    cash = api_payload.get("historical_cash", [])
    news_headline = api_payload.get("news_headline", "")
    dynamic_shock_rate = calculate_news_shock(news_headline)
    df = pd.DataFrame({
        'ds': pd.to_datetime(dates),
        'y': cash
    })
    logging.getLogger('cmdstanpy').setLevel(logging.ERROR)
    model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    model.fit(df)
    future_frame = model.make_future_dataframe(periods=30)
    prediction = model.predict(future_frame)
    future_horizon = prediction.tail(30).copy().reset_index(drop=True)
    if dynamic_shock_rate > 0:
        print(f"⚠️ Injecting {dynamic_shock_rate * 100}% NLP-Driven Shock Vector Across 30 Days...")
        for operational_day in range(30):
            degradation_coefficient = 1.0 - (dynamic_shock_rate * (operational_day / 29))
            future_horizon.loc[operational_day, 'yhat'] *= degradation_coefficient
    regulatory_floor = 70.0
    breaches = future_horizon[future_horizon['yhat'] < regulatory_floor]['ds']
    has_breached = len(breaches) > 0
    first_breach_timestamp = breaches.iloc[0].strftime('%Y-%m-%d') if has_breached else None
    compiled_response = {
        "predicted_dates": future_horizon['ds'].dt.strftime('%Y-%m-%d').tolist(),
        "forecasted_cash": future_horizon['yhat'].round(2).tolist(),
        "will_breach_minimum": has_breached,
        "breach_date": first_breach_timestamp,
        "metrics": {
            "applied_nlp_shock_pct": round(dynamic_shock_rate * 100, 2),
            "headline_evaluated": news_headline
        }
    }
    
    print("✅ Advanced NLP Engine Pipeline Complete. Matrix output generated successfully.")
    return compiled_response

if __name__ == "__main__":
    csv_path = "../liquidity_data.csv"
    
    if os.path.exists(csv_path):
        base_data = pd.read_csv(csv_path)
        mock_api_payload = {
            "branch_id": "BR-101",
            "tenant_id": "HDFC-MAIN",
            "historical_dates": base_data['ds'].astype(str).tolist(),
            "historical_cash": base_data['y'].tolist(),
            "news_headline": "Severe market downgrade drops index by 800 points as major bank runs spread nationally."
        }
        
        output_json = run_advanced_nlp_pipeline(mock_api_payload)
        
        print("\n📦 COMPILED FULL-STACK PAYLOAD JSON FOR DEPLOYMENT:")
        print(json.dumps(output_json, indent=2))
    else:
        print(f"❌ Critical Error: Could not locate baseline data engine history file at {csv_path}")