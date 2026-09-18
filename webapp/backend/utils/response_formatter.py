def success_response(data):
    """Create a successful API response."""
    return {
        "ok": True,
        **data
    }


def error_response(message):
    """Create a standardized API error response."""
    return {
        "ok": False,
        "error": message
    }


def query_response(columns, rows, elapsed_ms, max_rows):
    """Format a SELECT query response."""
    return success_response({
        "kind": "query",
        "columns": columns,
        "rows": rows,
        "rowCount": len(rows),
        "truncated": len(rows) == max_rows,
        "elapsedMs": elapsed_ms,
    })


def execute_response(affected_rows, elapsed_ms):
    """Format an INSERT/UPDATE/DELETE response."""
    return success_response({
        "kind": "execute",
        "message": (
            f"Statement executed. "
            f"{affected_rows} row(s) affected."
        ),
        "rowCount": affected_rows,
        "elapsedMs": elapsed_ms,
    })