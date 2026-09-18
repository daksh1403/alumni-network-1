from flask import Blueprint, jsonify

from backend.services.query_service import get_sqlite_connection

schema_bp = Blueprint("schema", __name__)


@schema_bp.get("/api/schema")
def schema():
    """Return database tables, columns, and primary keys."""
    try:
        conn = get_sqlite_connection()

        tables = {}

        cursor = conn.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        )

        table_names = [row[0] for row in cursor.fetchall()]

        for table_name in table_names:
            columns = []
            primary_keys = []

            column_cursor = conn.execute(
                f'PRAGMA table_info("{table_name}")'
            )

            for column in column_cursor.fetchall():
                columns.append({
                    "name": column[1],
                    "type": column[2] or "TEXT"
                })

                if column[5]:
                    primary_keys.append(column[1])

            tables[table_name] = {
                "columns": columns,
                "pk": primary_keys
            }

        conn.close()

        return jsonify(tables=tables)

    except Exception as exc:
        return jsonify({
            "ok": False,
            "error": str(exc)
        }), 503