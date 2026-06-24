import pandas as pd
import matplotlib.pyplot as plt
from prophet import Prophet
import os

def generate_stressed_forecast(csv_path: str, retail_runoff: float = 0.0, corporate_runoff: float = 0.0):
    """Reads data, trains Prophet, applies stress shocks, and saves the graph."""
    
    # 1. Load Data
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    df['ds'] = pd.to_datetime(df['ds'])

    # 2. Train the AI Model
    print("🧠 Training LiquiShield predictive weights...")
    model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    model.fit(df)

    # 3. Generate Baseline Forecast
    print("🔮 Simulating future timelines...")
    future_dates = model.make_future_dataframe(periods=30)
    forecast = model.predict(future_dates)

    # --- 💥 4. APPLY SCENARIO SHOCKS (Day 5 Math) ---
    total_drain_factor = retail_runoff + corporate_runoff
    if total_drain_factor > 0:
        print(f"⚠️ Applying Stress Shock: {total_drain_factor*100}% Total Drain")
        
        # Apply the linear degradation only to the last 30 days
        for day_index in range(30):
            # Calculate the exact row index in the dataframe
            row_idx = len(forecast) - 30 + day_index 
            daily_shock_multiplier = 1.0 - (total_drain_factor * (day_index / 29))
            
            # Crush the predictions
            forecast.loc[row_idx, 'yhat'] *= daily_shock_multiplier
            forecast.loc[row_idx, 'yhat_lower'] *= daily_shock_multiplier
            forecast.loc[row_idx, 'yhat_upper'] *= daily_shock_multiplier

    # 5. Show Numbers in Terminal
    print("\n✅ Prediction complete! Final 5 days:")
    print(forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail())

    # --- 📊 6. GENERATE THE GRAPH ---
    print("\n📊 Generating stress-test chart...")
    fig = model.plot(forecast)
    plt.title(f"LiquiShield: 30-Day Forecast ({total_drain_factor*100}% Stress Shock)", fontsize=14, fontweight='bold')
    plt.xlabel("Timeline", fontsize=12)
    plt.ylabel("Liquidity Balance (Crores INR)", fontsize=12)
    
    plt.savefig("liquishield_stressed_chart.png", dpi=300, bbox_inches='tight')
    print("✅ Success! Check ai_engine folder for 'liquishield_stressed_chart.png'")
    
    return forecast

# --- Run the Test ---
if __name__ == "__main__":
    generate_stressed_forecast(
        csv_path="../liquidity_data.csv", 
        retail_runoff=0.20, 
        corporate_runoff=0.15
    )