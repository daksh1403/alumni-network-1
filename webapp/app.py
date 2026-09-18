"""
Alumni Network and Engagement Platform
Main Flask application entry point.

The backend functionality is organized into separate modules:
- routes/health.py  -> Health API
- routes/schema.py  -> Database schema API
- routes/stats.py   -> Database statistics API
- routes/query.py   -> SQL query API
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, send_from_directory

from backend.routes.health import health_bp
from backend.routes.schema import schema_bp
from backend.routes.stats import stats_bp
from backend.routes.query import query_bp


# ================================================================
# Configuration
# ================================================================

load_dotenv()

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

BASE_DIR = Path(__file__).resolve().parent


# ================================================================
# Flask Application
# ================================================================

app = Flask(
    __name__,
    static_folder="static",
    static_url_path=""
)


# ================================================================
# Register Backend Blueprints
# ================================================================

app.register_blueprint(health_bp)
app.register_blueprint(schema_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(query_bp)


# ================================================================
# CORS
# ================================================================

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = os.getenv(
        "ALLOWED_ORIGIN", "*"
    )
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# ================================================================
# Frontend
# ================================================================

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ================================================================
# Application Entry Point
# ================================================================

if __name__ == "__main__":
    print(f"[app] Starting Alumni Network backend on {HOST}:{PORT}")
    app.run(
        host=HOST,
        port=PORT,
        debug=False
    )