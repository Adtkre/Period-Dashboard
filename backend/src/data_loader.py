import pandas as pd
import numpy as np
from pathlib import Path
from backend.config import DATA_FILE

def load_raw_data(filepath=None) -> pd.DataFrame:
    """Load the raw menstrual cycle dataset from CSV."""
    path = filepath or DATA_FILE
    if not Path(path).exists():
        # Fallback to root or alternative locations if needed
        alt_path = Path(__file__).resolve().parent.parent.parent / "menstrual_cycle_dataset_with_factors.csv"
        if alt_path.exists():
            path = alt_path
        else:
            raise FileNotFoundError(f"Dataset not found at {path} or {alt_path}")
            
    df = pd.read_csv(path)
    
    # Clean whitespace in string columns
    str_cols = df.select_dtypes(include=['object']).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
        
    # Convert dates to datetime
    if 'Cycle Start Date' in df.columns:
        df['Cycle Start Date'] = pd.to_datetime(df['Cycle Start Date'])
    if 'Next Cycle Start Date' in df.columns:
        df['Next Cycle Start Date'] = pd.to_datetime(df['Next Cycle Start Date'])
        
    # Sort chronologically by User and Cycle Start Date
    df = df.sort_values(by=['User ID', 'Cycle Start Date']).reset_index(drop=True)
    
    # Add helper categories for analysis
    df['Age Group'] = pd.cut(
        df['Age'],
        bins=[17, 24, 34, 44, 60],
        labels=['18-24', '25-34', '35-44', '45+']
    )
    
    df['BMI Category'] = pd.cut(
        df['BMI'],
        bins=[0, 18.49, 24.99, 29.99, 100],
        labels=['Underweight', 'Normal', 'Overweight', 'Obese']
    )
    
    df['Sleep Category'] = pd.cut(
        df['Sleep Hours'],
        bins=[0, 5.99, 6.99, 7.99, 24],
        labels=['<6 hrs', '6-7 hrs', '7-8 hrs', '8+ hrs']
    )
    
    # Define Cycle Length Category tertiles: Short (<33), Moderate (33-41), Extended (>=42)
    df['Cycle Category'] = pd.cut(
        df['Cycle Length'],
        bins=[0, 32.5, 41.5, 100],
        labels=['Short (<33d)', 'Moderate (33-41d)', 'Extended (>=42d)']
    )
    
    return df

if __name__ == '__main__':
    data = load_raw_data()
    print("Loaded data shape:", data.shape)
    print("Columns:", data.columns.tolist())
    print("Cycle Categories count:\n", data['Cycle Category'].value_counts())
