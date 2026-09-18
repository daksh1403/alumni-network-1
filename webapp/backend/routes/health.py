from flask import Blueprint, jsonify

from backend.services.query_service import get_sqlite_connection

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    """Check whether the database is available."""
    try:
        conn = get_sqlite_connection()
        conn.execute("SELECT 1")
        conn.close()

        return jsonify(
            ok=True,
            engine="SQLite",
            database="connected"
        )

    except Exception as exc:
        return jsonify(
            ok=False,
            error=str(exc)
        ), 503