import datetime
import os
import re
import sqlite3
import time
from decimal import Decimal
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "alumni.db"

DATABASE_URL = os.getenv("DATABASE_URL", "")
USE_POSTGRES = bool(DATABASE_URL)

MAX_ROWS = int(os.getenv("MAX_ROWS", "1000"))


def _json_value(value):
    """Convert database values into JSON-compatible values."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, datetime.datetime):
        return value.isoformat(sep=" ", timespec="seconds")

    if isinstance(value, (datetime.date, datetime.time)):
        return value.isoformat()

    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")

    return str(value)


def strip_sql(sql: str) -> str:
    """Remove surrounding whitespace and a trailing semicolon."""
    sql = sql.strip()

    if sql.endswith(";"):
        sql = sql[:-1].rstrip()

    return sql


def statement_kind(sql: str) -> str:
    """Determine whether SQL is a query or an execution statement."""
    match = re.match(r"\s*([A-Za-z]+)", sql)
    keyword = match.group(1).upper() if match else ""

    if keyword in ("SELECT", "WITH", "EXPLAIN"):
        return "query"

    return "execute"


def get_sqlite_connection():
    """Create a SQLite connection with foreign-key support enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def execute_query(sql: str):
    """
    Execute a SQL statement against the configured database.

    Returns a dictionary containing either query results
    or execution information.
    """
    sql = strip_sql(sql)

    if not sql:
        raise ValueError("Empty statement.")

    if "\x00" in sql:
        raise ValueError("Invalid characters in statement.")

    kind = statement_kind(sql)
    started = time.perf_counter()

    if USE_POSTGRES:
        return _execute_postgres(sql, kind, started)

    return _execute_sqlite(sql, kind, started)


def _execute_sqlite(sql, kind, started):
    """Execute SQL using the local SQLite database."""
    conn = get_sqlite_connection()

    try:
        cursor = conn.execute(sql)

        if kind == "query":
            columns = (
                [description[0] for description in cursor.description]
                if cursor.description
                else []
            )

            rows = cursor.fetchmany(MAX_ROWS)

            data = [
                [_json_value(value) for value in row]
                for row in rows
            ]

            elapsed = round(
                (time.perf_counter() - started) * 1000,
                1
            )

            return {
                "ok": True,
                "kind": "query",
                "columns": columns,
                "rows": data,
                "rowCount": len(data),
                "truncated": len(rows) == MAX_ROWS,
                "elapsedMs": elapsed,
            }

        conn.commit()

        affected = cursor.rowcount if cursor.rowcount > -1 else 0

        elapsed = round(
            (time.perf_counter() - started) * 1000,
            1
        )

        return {
            "ok": True,
            "kind": "execute",
            "message": (
                f"Statement executed. "
                f"{affected} row(s) affected."
            ),
            "rowCount": affected,
            "elapsedMs": elapsed,
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def _execute_postgres(sql, kind, started):
    """Execute SQL using the PostgreSQL database."""
    import psycopg2
    import psycopg2.extras

    conn = psycopg2.connect(DATABASE_URL)

    try:
        cursor = conn.cursor()
        cursor.execute(sql)

        if kind == "query":
            columns = (
                [description[0] for description in cursor.description]
                if cursor.description
                else []
            )

            rows = cursor.fetchmany(MAX_ROWS)

            data = [
                [_json_value(value) for value in row]
                for row in rows
            ]

            elapsed = round(
                (time.perf_counter() - started) * 1000,
                1
            )

            return {
                "ok": True,
                "kind": "query",
                "columns": columns,
                "rows": data,
                "rowCount": len(data),
                "truncated": len(rows) == MAX_ROWS,
                "elapsedMs": elapsed,
            }

        conn.commit()

        affected = (
            cursor.rowcount
            if cursor.rowcount and cursor.rowcount > -1
            else 0
        )

        elapsed = round(
            (time.perf_counter() - started) * 1000,
            1
        )

        return {
            "ok": True,
            "kind": "execute",
            "message": (
                f"Statement executed. "
                f"{affected} row(s) affected."
            ),
            "rowCount": affected,
            "elapsedMs": elapsed,
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()