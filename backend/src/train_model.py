import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.dummy import DummyClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    mean_absolute_error,
    root_mean_squared_error
)

from backend.config import MODEL_FILE, REGRESSOR_FILE, METADATA_FILE, MODELS_DIR
from backend.src.data_loader import load_raw_data
from backend.src.feature_engineering import (
    compute_historical_features,
    FEATURE_COLUMNS,
    TARGET_COLUMN
)
from backend.src.preprocessing import build_preprocessor

def train_and_evaluate(random_state=42):
    """
    Trains the Random Forest classification pipeline using user-grouped split to prevent data leakage.
    Also trains a Random Forest regressor for baseline/continuous cycle length comparison.
    Saves the pipeline and evaluation metadata.
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Load and prepare dataset
    raw_df = load_raw_data()
    df = compute_historical_features(raw_df)
    
    # Target and features
    X = df[FEATURE_COLUMNS]
    y_class = df[TARGET_COLUMN].astype(str)
    y_reg = df['Cycle Length'].values
    groups = df['User ID'].values
    
    # Document category boundaries and mean values
    categories = ['Short (<33d)', 'Moderate (33-41d)', 'Extended (>=42d)']
    category_means = {
        cat: float(df[df[TARGET_COLUMN] == cat]['Cycle Length'].mean())
        for cat in categories
    }
    
    # 2. User-grouped train-test split (75% train users, 25% test users)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=random_state)
    train_idx, test_idx = next(gss.split(X, y_class, groups=groups))
    
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train_class, y_test_class = y_class.iloc[train_idx], y_class.iloc[test_idx]
    y_train_reg, y_test_reg = y_reg[train_idx], y_reg[test_idx]
    
    train_users = int(len(np.unique(groups[train_idx])))
    test_users = int(len(np.unique(groups[test_idx])))
    
    # 3. Build & fit Classification Pipeline
    preprocessor = build_preprocessor()
    rf_clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=6,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=random_state,
        class_weight='balanced'
    )
    clf_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', rf_clf)
    ])
    clf_pipeline.fit(X_train, y_train_class)
    
    # 4. Fit Baseline Dummy Model (Most Frequent)
    dummy_clf = DummyClassifier(strategy='most_frequent')
    dummy_clf.fit(X_train, y_train_class)
    dummy_pred = dummy_clf.predict(X_test)
    baseline_acc = float(accuracy_score(y_test_class, dummy_pred))
    baseline_f1 = float(f1_score(y_test_class, dummy_pred, average='macro', zero_division=0))
    
    # 5. Fit Regressor Model for continuous comparison
    rf_reg = RandomForestRegressor(
        n_estimators=120,
        max_depth=6,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=random_state
    )
    reg_pipeline = Pipeline([
        ('preprocessor', build_preprocessor()),
        ('regressor', rf_reg)
    ])
    reg_pipeline.fit(X_train, y_train_reg)
    reg_pred = reg_pipeline.predict(X_test)
    reg_mae = float(mean_absolute_error(y_test_reg, reg_pred))
    reg_rmse = float(root_mean_squared_error(y_test_reg, reg_pred))
    
    # 6. Evaluate Classifier on Held-Out Test Set
    y_pred_class = clf_pipeline.predict(X_test)
    acc = float(accuracy_score(y_test_class, y_pred_class))
    prec_macro = float(precision_score(y_test_class, y_pred_class, average='macro', zero_division=0))
    rec_macro = float(recall_score(y_test_class, y_pred_class, average='macro', zero_division=0))
    f1_macro = float(f1_score(y_test_class, y_pred_class, average='macro', zero_division=0))
    f1_weighted = float(f1_score(y_test_class, y_pred_class, average='weighted', zero_division=0))
    
    # Labels sorted
    unique_labels = sorted(list(set(y_class)))
    cm = confusion_matrix(y_test_class, y_pred_class, labels=unique_labels).tolist()
    cr_dict = classification_report(y_test_class, y_pred_class, labels=unique_labels, output_dict=True, zero_division=0)
    
    # 7. Extract Feature Importances
    fitted_preprocessor = clf_pipeline.named_steps['preprocessor']
    fitted_rf = clf_pipeline.named_steps['classifier']
    
    # Get feature names after one-hot encoding
    cat_encoder = fitted_preprocessor.named_transformers_['cat']
    cat_feature_names = cat_encoder.get_feature_names_out(input_features=['Exercise Frequency', 'Diet', 'Symptoms']).tolist()
    num_feature_names = [
        'Age', 'BMI', 'Stress Level', 'Sleep Hours', 'Period Length',
        'prev_cycle_length', 'hist_mean_cycle_length', 'hist_std_cycle_length', 'prior_cycle_count'
    ]
    all_feature_names = num_feature_names + cat_feature_names
    importances = fitted_rf.feature_importances_
    
    feature_importance_list = [
        {"feature": name, "importance": float(imp)}
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
    ]
    
    # 8. Save models
    joblib.dump(clf_pipeline, MODEL_FILE)
    joblib.dump(reg_pipeline, REGRESSOR_FILE)
    
    metadata = {
        "dataset_size": len(df),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "train_users": train_users,
        "test_users": test_users,
        "categories": categories,
        "class_labels": unique_labels,
        "category_means": category_means,
        "metrics": {
            "accuracy": acc,
            "precision_macro": prec_macro,
            "recall_macro": rec_macro,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "baseline_accuracy": baseline_acc,
            "baseline_f1_macro": baseline_f1,
            "reg_mae": reg_mae,
            "reg_rmse": reg_rmse
        },
        "confusion_matrix": cm,
        "classification_report": cr_dict,
        "feature_importances": feature_importance_list,
        "training_features": FEATURE_COLUMNS
    }
    
    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Model successfully trained and saved to {MODEL_FILE}")
    print(f"Accuracy: {acc:.4f}, Macro F1: {f1_macro:.4f}, Baseline Accuracy: {baseline_acc:.4f}")
    return metadata

if __name__ == '__main__':
    train_and_evaluate()
