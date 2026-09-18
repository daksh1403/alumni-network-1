from flask import Blueprint, jsonify

from backend.services.query_service import get_sqlite_connection

stats_bp = Blueprint("stats", __name__)

from flask import Blueprint, jsonify

from backend.services.query_service import get_sqlite_connection

stats_bp = Blueprint("stats", __name__)


@stats_bp.get("/api/stats")
def stats():
    """Return record counts for the main database tables."""
    try:
        conn = get_sqlite_connection()

        counts = {}

        tables = {
            "alumni": "ALUMNI",
            "students": "STUDENT",
            "events": "EVENT",
            "donations": "DONATION",
        }

        for key, table in tables.items():
            cursor = conn.execute(
                f'SELECT COUNT(*) FROM "{table}"'
            )
            counts[key] = cursor.fetchone()[0]

        conn.close()

        return jsonify(
            database="local",
            engine="SQLite",
            stats=counts
        )

    except Exception as exc:
        return jsonify(
            database="local",
            engine="SQLite",
            stats={},
            error=str(exc)
        ), 503