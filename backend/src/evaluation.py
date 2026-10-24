import json
from pathlib import Path
from backend.config import METADATA_FILE
from backend.src.train_model import train_and_evaluate

def get_evaluation_metrics():
    """
    Returns the held-out evaluation results, confusion matrix, classification report,
    feature importances, and baseline comparisons from the saved model metadata.
    """
    if not METADATA_FILE.exists():
        metadata = train_and_evaluate()
    else:
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            
    return metadata
