import pandas as pd
import numpy as np

def compute_historical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes chronological lagged historical features per user without data leakage.
    For each cycle t of a user:
      - prev_cycle_length: cycle length at t-1 (filled with global mean if first cycle)
      - hist_mean_cycle_length: mean of cycle lengths before t (filled with global mean if first cycle)
      - hist_std_cycle_length: std of cycle lengths before t (filled with 0.0 if <= 1 prior cycle)
      - prior_cycle_count: count of prior recorded cycles (0, 1, 2, ...)
    """
    df = df.copy()
    
    # Ensure chronological order per user
    if 'Cycle Start Date' in df.columns:
        df = df.sort_values(by=['User ID', 'Cycle Start Date']).reset_index(drop=True)
    else:
        df = df.sort_values(by=['User ID']).reset_index(drop=True)
        
    global_mean_length = df['Cycle Length'].mean()
    
    def process_user_history(user_df):
        user_df = user_df.copy()
        n = len(user_df)
        lengths = user_df['Cycle Length'].values
        
        prev_lengths = []
        hist_means = []
        hist_stds = []
        prior_counts = []
        
        for i in range(n):
            prior_counts.append(i)
            if i == 0:
                prev_lengths.append(global_mean_length)
                hist_means.append(global_mean_length)
                hist_stds.append(0.0)
            else:
                past = lengths[:i]
                prev_lengths.append(past[-1])
                hist_means.append(float(np.mean(past)))
                hist_stds.append(float(np.std(past, ddof=1)) if len(past) > 1 else 0.0)
                
        user_df['prev_cycle_length'] = prev_lengths
        user_df['hist_mean_cycle_length'] = hist_means
        user_df['hist_std_cycle_length'] = hist_stds
        user_df['prior_cycle_count'] = prior_counts
        return user_df

    user_dfs = []
    for _, user_group in df.groupby('User ID'):
        user_dfs.append(process_user_history(user_group))
    return pd.concat(user_dfs, ignore_index=True)

FEATURE_COLUMNS = [
    'Age',
    'BMI',
    'Stress Level',
    'Exercise Frequency',
    'Sleep Hours',
    'Diet',
    'Period Length',
    'Symptoms',
    'prev_cycle_length',
    'hist_mean_cycle_length',
    'hist_std_cycle_length',
    'prior_cycle_count'
]

TARGET_COLUMN = 'Cycle Category'
NUMERIC_FEATURES = [
    'Age', 'BMI', 'Stress Level', 'Sleep Hours', 'Period Length',
    'prev_cycle_length', 'hist_mean_cycle_length', 'hist_std_cycle_length', 'prior_cycle_count'
]
CATEGORICAL_FEATURES = [
    'Exercise Frequency', 'Diet', 'Symptoms'
]
