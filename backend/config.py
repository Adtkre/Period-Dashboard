import os
from pathlib import Path

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent

# Data paths
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "menstrual_cycle_dataset_with_factors.csv"

# Models directory
MODELS_DIR = BASE_DIR / "models"
MODEL_FILE = MODELS_DIR / "random_forest_pipeline.joblib"
REGRESSOR_FILE = MODELS_DIR / "random_forest_regressor.joblib"
METADATA_FILE = MODELS_DIR / "model_metadata.json"

# Server configuration
HOST = os.getenv("FLASK_HOST", "0.0.0.0")
PORT = int(os.getenv("FLASK_PORT", 5000))
DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "*"
]
