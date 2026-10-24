from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import io
import csv

from backend.config import HOST, PORT, DEBUG, ALLOWED_ORIGINS
from backend.src.eda import (
    get_overview_metrics,
    get_eda_distributions,
    get_cycle_patterns,
    get_lifestyle_correlations,
    get_data_supported_findings,
    get_paginated_dataset,
    get_data
)
from backend.src.evaluation import get_evaluation_metrics
from backend.src.predict import predict_next_period

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

# 1. Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Cycle Insights API",
        "version": "1.0.0"
    })

# 2. Overview metrics
@app.route('/api/overview', methods=['GET'])
def overview_endpoint():
    try:
        data = get_overview_metrics()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. EDA Distributions (supports filtering)
@app.route('/api/eda/distributions', methods=['GET'])
def eda_distributions_endpoint():
    try:
        filters = {
            'age_group': request.args.get('age_group'),
            'bmi_category': request.args.get('bmi_category'),
            'stress_level': request.args.get('stress_level'),
            'exercise_frequency': request.args.get('exercise_frequency'),
            'diet': request.args.get('diet')
        }
        # Filter out None/empty
        active_filters = {k: v for k, v in filters.items() if v}
        data = get_eda_distributions(active_filters)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. Cycle Patterns
@app.route('/api/eda/cycle-patterns', methods=['GET'])
def cycle_patterns_endpoint():
    try:
        user_id = request.args.get('user_id', 1)
        data = get_cycle_patterns(selected_user_id=user_id)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5. Correlations
@app.route('/api/eda/correlations', methods=['GET'])
def correlations_endpoint():
    try:
        data = get_lifestyle_correlations()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 6. Lifestyle comparisons
@app.route('/api/eda/lifestyle', methods=['GET'])
def lifestyle_endpoint():
    try:
        data = get_lifestyle_correlations()
        # Returns the lifestyle subset
        lifestyle_data = {
            "stress_comparison": data["stress_comparison"],
            "sleep_comparison": data["sleep_comparison"],
            "exercise_comparison": data["exercise_comparison"],
            "diet_comparison": data["diet_comparison"],
            "symptoms_analysis": data["symptoms_analysis"],
            "causality_note": data["causality_note"]
        }
        return jsonify(lifestyle_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 7. Model evaluation
@app.route('/api/model/evaluation', methods=['GET'])
def model_evaluation_endpoint():
    try:
        data = get_evaluation_metrics()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 8. Paginated Dataset
@app.route('/api/dataset', methods=['GET'])
def dataset_endpoint():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 15))
        sort_by = request.args.get('sort_by', 'Cycle Start Date')
        sort_dir = request.args.get('sort_dir', 'desc')
        search = request.args.get('search', '')
        
        filters = {
            'diet': request.args.get('diet'),
            'exercise': request.args.get('exercise'),
            'symptoms': request.args.get('symptoms'),
            'stress': request.args.get('stress')
        }
        active_filters = {k: v for k, v in filters.items() if v}
        
        data = get_paginated_dataset(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_dir=sort_dir,
            search=search,
            filters=active_filters
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 8b. Dataset CSV Export
@app.route('/api/dataset/export', methods=['GET'])
def dataset_export_endpoint():
    try:
        df = get_data().copy()
        df['Cycle Start Date'] = df['Cycle Start Date'].dt.strftime('%Y-%m-%d')
        df['Next Cycle Start Date'] = df['Next Cycle Start Date'].dt.strftime('%Y-%m-%d')
        
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = "attachment; filename=menstrual_cycle_dataset_export.csv"
        response.headers["Content-type"] = "text/csv"
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 9. Next period prediction
@app.route('/api/predict', methods=['POST'])
def predict_endpoint():
    try:
        payload = request.get_json(force=True, silent=True)
        if not payload:
            return jsonify({"status": "error", "error": "Invalid or missing JSON payload"}), 400
            
        result = predict_next_period(payload)
        return jsonify(result)
    except ValueError as ve:
        return jsonify({"status": "error", "error": str(ve)}), 400
    except FileNotFoundError as fnf:
        return jsonify({"status": "error", "error": str(fnf)}), 503
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# 10. EDA Findings
@app.route('/api/findings', methods=['GET'])
def findings_endpoint():
    try:
        findings = get_data_supported_findings()
        return jsonify({"findings": findings})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Starting Cycle Insights API server on {HOST}:{PORT}...")
    app.run(host=HOST, port=PORT, debug=DEBUG)
