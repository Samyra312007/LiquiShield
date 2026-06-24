import pandas as pd
import os

def load_and_clean_data(file_name="liquidity_data.csv"):
    # Looks one directory up (root) to find the data
    base_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(base_dir)
    file_path = os.path.join(parent_dir, file_name)
    
    # Fallback in case you execute directly from the root
    if not os.path.exists(file_path):
        file_path = file_name
        
    print(f"🔄 Reading LiquiShield data from: {file_path}")
    df = pd.read_csv(file_path)
    
    # Ensure standard Prophet naming conventions
    df['ds'] = pd.to_datetime(df['ds'])
    df['y'] = pd.to_numeric(df['y'])
    
    return df