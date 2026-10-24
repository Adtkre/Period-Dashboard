import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from backend.config import MODEL_FILE, REGRESSOR_FILE, METADATA_FILE
from backend.src.feature_engineering import FEATURE_COLUMNS
from backend.src.evaluation import get_evaluation_metrics

def validate_prediction_input(data: dict) -> tuple[bool, str]:
    """Validates user input fields for prediction."""
    required = ['last_start_date', 'age', 'bmi', 'stress_level', 'sleep_hours', 
                'exercise_frequency', 'diet', 'period_length', 'symptoms']
    for field in required:
        if field not in data or data[field] is None or data[field] == '':
            return False, f"Missing required field: {field}"
            
    try:
        age = float(data['age'])
        if not (12 <= age <= 65):
            return False, "Age must be between 12 and 65"
            
        bmi = float(data['bmi'])
        if not (10 <= bmi <= 60):
            return False, "BMI must be between 10 and 60"
            
        stress = int(data['stress_level'])
        if not (1 <= stress <= 5):
            return False, "Stress level must be an integer between 1 and 5"
            
        sleep = float(data['sleep_hours'])
        if not (3 <= sleep <= 15):
            return False, "Sleep hours must be between 3 and 15"
            
        period = int(data['period_length'])
        if not (1 <= period <= 14):
            return False, "Period length must be between 1 and 14 days"
            
        datetime.strptime(str(data['last_start_date']).split('T')[0], "%Y-%m-%d")
    except ValueError as e:
        return False, f"Input validation error: {str(e)}"
        
    return True, ""

def predict_next_period(input_data: dict) -> dict:
    """
    Predicts cycle length category and calculates estimated next period date,
    fertile window, phase breakdown, confidence, and explanatory rationale.
    """
    is_valid, err_msg = validate_prediction_input(input_data)
    if not is_valid:
        raise ValueError(err_msg)
        
    if not MODEL_FILE.exists():
        raise FileNotFoundError("Model pipeline file not found. Please train the model first.")
        
    clf_pipeline = joblib.load(MODEL_FILE)
    reg_pipeline = joblib.load(REGRESSOR_FILE) if REGRESSOR_FILE.exists() else None
    metadata = get_evaluation_metrics()
    category_means = metadata.get("category_means", {
        "Short (<33d)": 28.6,
        "Moderate (33-41d)": 36.9,
        "Extended (>=42d)": 45.8
    })
    
    # Defaults for optional historical variables if not provided
    prev_len = float(input_data.get('prev_cycle_length', 37.0) or 37.0)
    hist_mean = float(input_data.get('hist_mean_cycle_length', prev_len) or prev_len)
    hist_std = float(input_data.get('hist_std_cycle_length', 3.0) or 3.0)
    prior_count = int(input_data.get('prior_cycle_count', 3) or 3)
    
    # Build single-row DataFrame matching training feature columns
    features_df = pd.DataFrame([{
        'Age': float(input_data['age']),
        'BMI': float(input_data['bmi']),
        'Stress Level': int(input_data['stress_level']),
        'Exercise Frequency': str(input_data['exercise_frequency']),
        'Sleep Hours': float(input_data['sleep_hours']),
        'Diet': str(input_data['diet']),
        'Period Length': int(input_data['period_length']),
        'Symptoms': str(input_data['symptoms']),
        'prev_cycle_length': prev_len,
        'hist_mean_cycle_length': hist_mean,
        'hist_std_cycle_length': hist_std,
        'prior_cycle_count': prior_count
    }])[FEATURE_COLUMNS]
    
    # Predict probabilities and class
    predicted_category = clf_pipeline.predict(features_df)[0]
    classes = list(clf_pipeline.classes_)
    probs = clf_pipeline.predict_proba(features_df)[0]
    
    prob_dict = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probs)}
    winning_confidence = round(float(np.max(probs)) * 100, 1)
    
    # Calculate probability-weighted cycle length & regressor cycle length
    weighted_length = 0.0
    for cls_name, prob in prob_dict.items():
        weighted_length += prob * category_means.get(cls_name, 37.0)
    weighted_length = round(weighted_length, 1)
    
    reg_length = None
    if reg_pipeline is not None:
        try:
            reg_length = round(float(reg_pipeline.predict(features_df)[0]), 1)
        except Exception:
            reg_length = None
            
    # Estimated cycle length to use for calendar projection:
    # Use category mean of predicted class, with weighted length as fine-grained reference
    primary_length = round(category_means.get(predicted_category, 37.0))
    
    # Date arithmetic
    last_date_str = str(input_data['last_start_date']).split('T')[0]
    last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date()
    predicted_next_date = last_date + timedelta(days=int(primary_length))
    
    # Uncertainty window: +- 2 days
    window_start = predicted_next_date - timedelta(days=2)
    window_end = predicted_next_date + timedelta(days=2)
    
    # Days remaining from today
    today = datetime.now().date()
    days_until_next = (predicted_next_date - today).days
    
    # Biological phase estimation (assuming ~14 day luteal phase)
    estimated_ovulation = predicted_next_date - timedelta(days=14)
    fertile_start = estimated_ovulation - timedelta(days=5)
    fertile_end = estimated_ovulation + timedelta(days=1)
    
    # Factors explanation
    explanations = []
    if float(input_data['stress_level']) >= 4:
        explanations.append("Elevated stress levels (>=4/5) can trigger cortisol surges that disrupt GnRH pulsatility and prolong the follicular phase.")
    if float(input_data['sleep_hours']) < 6.5:
        explanations.append("Restricted sleep (<6.5 hrs) is associated with increased cycle irregularity and altered melatonin/LH secretion.")
    if float(input_data['bmi']) >= 25:
        explanations.append("A BMI in the overweight range (>25) can be associated with increased peripheral estrogen conversion and longer follicular development.")
    elif float(input_data['bmi']) < 19:
        explanations.append("Low BMI (<19) can trigger hypothalamic conservation responses, leading to longer or delayed cycles.")
    if hist_mean > 40:
        explanations.append(f"Historical personal average of {hist_mean:.1f} days strongly skews expectations toward the extended cycle range.")
    elif hist_mean < 32:
        explanations.append(f"Historical personal average of {hist_mean:.1f} days aligns with shorter cycle intervals.")
    if not explanations:
        explanations.append("Baseline historical patterns and balanced lifestyle indicators align with normal cycle progression.")
        
    return {
        "status": "success",
        "last_start_date": last_date.isoformat(),
        "predicted_category": predicted_category,
        "predicted_cycle_length_days": primary_length,
        "weighted_cycle_length_days": weighted_length,
        "regressor_cycle_length_days": reg_length,
        "predicted_next_date": predicted_next_date.isoformat(),
        "uncertainty_window": {
            "start": window_start.isoformat(),
            "end": window_end.isoformat(),
            "days_range": "±2 days"
        },
        "days_remaining": days_until_next,
        "confidence_percentage": winning_confidence,
        "class_probabilities": prob_dict,
        "biological_phases": {
            "period_length": int(input_data['period_length']),
            "follicular_phase_est_days": max(primary_length - 14, 10),
            "estimated_ovulation_date": estimated_ovulation.isoformat(),
            "fertile_window": {
                "start": fertile_start.isoformat(),
                "end": fertile_end.isoformat()
            },
            "luteal_phase_est_days": 14
        },
        "explanations": explanations,
        "disclaimer": "This prediction is generated by a statistical machine learning model and serves as an educational estimate only. Menstrual cycle duration is influenced by numerous neuroendocrine, environmental, and individual biological factors. It should not be used as medical advice or for contraception."
    }
