# Cycle Insights — Menstrual Cycle Analysis & Prediction Dashboard

**Cycle Insights** is a full-stack, health analytics web application engineered for menstrual cycle exploratory data analysis (EDA), pattern recognition, lifestyle correlation analysis, and machine learning-powered next-period cycle prediction using Scikit-Learn Random Forest models.

---

## 1. Architectural Separation

The project maintains a clean separation of concerns between backend analytics and frontend client:

- **Frontend**: Genuine standalone HTML5, modern CSS3 (custom design system, responsive grid layouts, warm ivory/dusty rose health analytics aesthetics), and Vanilla JavaScript (modular architecture, Fetch API, Chart.js). No React, Streamlit, or Python templating engines are used for the UI.
- **Backend**: Python Flask REST API server exposing JSON endpoints with CORS support, powered by Pandas, NumPy, Scikit-Learn, and Joblib.

---

## 2. Directory Structure

```text
Kiisha/
├── backend/
│   ├── app.py                     # Main Flask REST API server
│   ├── config.py                  # Server configuration, paths, and CORS settings
│   ├── requirements.txt           # Python dependencies
│   ├── data/
│   │   └── menstrual_cycle_dataset_with_factors.csv
│   ├── models/
│   │   ├── random_forest_pipeline.joblib   # Trained Scikit-Learn RF Classifier
│   │   ├── random_forest_regressor.joblib  # Continuous RF Regressor comparison
│   │   └── model_metadata.json             # Held-out metrics, confusion matrix, importances
│   └── src/
│       ├── __init__.py
│       ├── data_loader.py         # CSV ingestion, data cleaning, and date parsing
│       ├── feature_engineering.py # User-level lagged features (no future leakage)
│       ├── preprocessing.py       # Scikit-learn ColumnTransformer pipelines
│       ├── train_model.py         # Grouped train/test split & model training
│       ├── predict.py             # Validation, inference, phase & calendar mapping
│       ├── evaluation.py          # Metric loading and formatting
│       └── eda.py                 # Statistical aggregations, correlations, findings
│
├── frontend/
│   ├── index.html                 # Main application structure & views
│   ├── css/
│   │   ├── styles.css             # Design tokens, typography, layouts, sidebar
│   │   ├── components.css         # Cards, KPI widgets, calendar, tables, badges
│   │   └── responsive.css         # Collapsible sidebar, tablet/mobile rules
│   └── js/
│       ├── api.js                 # Central API service with fetch wrappers
│       ├── app.js                 # Router, view switcher, health polling, toast alerts
│       ├── overview.js            # KPI metrics, distributions, quality audit, findings
│       ├── eda.js                 # Reactive filtering, box plot quartiles, cohort charts
│       ├── patterns.js            # User variability, tier comparisons, timeline history
│       ├── correlations.js        # Pearson heatmap, lifestyle & symptom charts
│       ├── prediction.js          # Interactive prediction form, probabilities, calendar
│       ├── evaluation.js          # Confusion matrix, classification report, feature importances
│       └── dataset.js             # Data table, search, column sorting, pagination, CSV export
│
└── README.md
```

---

## 3. Machine Learning & Statistical Methodology

### Leakage Prevention via User-Grouped Split
A dataset of repeated cycles per user risks massive optimistic data leakage if records from the same user appear in both training and test sets. To guarantee clinical validity:
- We employ `GroupShuffleSplit` on `User ID` (75 train users with 661 cycles vs 25 test users with 234 cycles).
- No user present in the test set has any cycle records in the training set.

### Historical Lagged Feature Engineering
For any cycle $t$:
- `prev_cycle_length`: Cycle length of cycle $t-1$.
- `hist_mean_cycle_length`: Expanding mean of previous cycles for that individual.
- `hist_std_cycle_length`: Expanding standard deviation of previous cycles.
- `prior_cycle_count`: Ordinal index of prior cycles recorded.
- Future cycle dates and target cycle duration are strictly excluded from input features.

### Target Boundaries & Categories
Cycle duration is categorized into clinical tertiles based on population distributions:
1. **Short (<33d)**: Range 25 to 32 days (mean: 28.6 days).
2. **Moderate (33-41d)**: Range 33 to 41 days (mean: 36.9 days).
3. **Extended (>=42d)**: Range 42 to 50 days (mean: 45.8 days).

### Prediction Calibration & Uncertainty
- The classifier outputs well-calibrated class probabilities across all three categories.
- Primary calendar date is projected using the predicted category mean, alongside probability-weighted expectations and continuous Random Forest regression estimates.
- Projected dates include a documented uncertainty interval ($\pm2$ days) and an interactive monthly calendar highlighting active menstruation, the estimated fertile window, ovulation day, and the predicted next period window.

---

## 4. Setup & Local Launch Instructions

### Prerequisites
- Python 3.10+
- A modern web browser (Chrome, Edge, Firefox, Safari)

### Step 1: Install Backend Dependencies
In your terminal, navigate to the project directory:
```bash
pip install -r backend/requirements.txt
```

### Step 2: (Optional) Retrain Model Pipeline
The models and evaluation metadata are already pre-trained and serialized in `backend/models/`. If you wish to retrain from scratch:
```bash
python -m backend.src.train_model
```

### Step 3: Start the Flask REST API Backend
Launch the Flask API server (running on `http://127.0.0.1:5000`):
```bash
python -m backend.app
```
You can verify the backend is active by opening `http://127.0.0.1:5000/api/health` in your browser.

### Step 4: Serve the Frontend
In a separate terminal, serve the `frontend/` directory on port 5500:

Using Python:
```bash
python -m http.server 5500 --directory frontend
```
Or using Node `npx serve`:
```bash
npx serve frontend -p 5500
```
Or using VS Code / IDE Live Server extension on port 5500.

Now open your browser and navigate to:
**`http://127.0.0.1:5500`** (or `http://localhost:5500`)

---

## 5. REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health status and version check |
| `/api/overview` | GET | Top-level KPI cards, cycle distributions, and quality summary |
| `/api/eda/distributions` | GET | Box plot stats, categorical distributions (supports query filters) |
| `/api/eda/cycle-patterns` | GET | Intra-user variability stats and individual user trajectory (`?user_id=1`) |
| `/api/eda/correlations` | GET | Pearson correlation matrix and lifestyle comparisons |
| `/api/eda/lifestyle` | GET | Stress, sleep, exercise, diet, and symptom distributions |
| `/api/model/evaluation` | GET | Test cohort accuracy, precision, recall, F1, confusion matrix, and feature importances |
| `/api/dataset` | GET | Searchable, sortable, paginated dataset records |
| `/api/dataset/export` | GET | Direct CSV download of full dataset |
| `/api/predict` | POST | Next period prediction, phase calculation, calendar dates, and explanations |
| `/api/findings` | GET | Data-backed statistical findings and insights |

---

## 6. Medical Disclaimer

Predictions and biological phase breakdowns generated by this application are statistical approximations based on observational cohort data. Menstrual cycle timing is subject to natural physiological, endocrine, and environmental variability. This software is designed for educational and data exploration purposes and should not be used as medical advice or as a method of contraception.
