from flask import Blueprint, jsonify, request

from backend.services.query_service import execute_query

query_bp = Blueprint("query", __name__)


@query_bp.post("/api/query")
def run_query():
    """Execute a SQL query sent by the client."""
    body = request.get_json(silent=True) or {}

    sql = str(body.get("sql", ""))

    if not sql.strip():
        return jsonify({
            "ok": False,
            "error": "Empty statement."
        }), 400

    try:
        result = execute_query(sql)
        return jsonify(result)

    except ValueError as exc:
        return jsonify({
            "ok": False,
            "error": str(exc)
        }), 400

    except Exception as exc:
        return jsonify({
            "ok": False,
            "error": str(exc)
        }), 400


@query_bp.route("/api/query", methods=["OPTIONS"])
def query_preflight():
    """Handle CORS preflight requests."""
    return "", 204