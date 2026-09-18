# Alumni Network SQL Console

This repository contains the Cloudflare Worker and D1 backend for the Alumni Network SQL console. The existing static frontend is intentionally unchanged.

## SQL execution model

Normal SQL continues to execute directly against Cloudflare D1 (SQLite), including DQL, DML, DDL, joins, subqueries, CTEs, and window queries.

The backend also provides an educational Oracle-style PL/SQL compatibility layer. D1 cannot execute Oracle PL/SQL directly, so the Worker detects PL/SQL, tokenizes it, parses an AST, and executes only supported AST nodes. Embedded `SELECT INTO`, `INSERT`, `UPDATE`, and `DELETE` statements use the existing D1 binding.

This is not an Oracle Database runtime. It supports commonly taught DBMS-lab syntax and intentionally does not claim full Oracle compatibility.

## PL/SQL compatibility

Supported backend syntax includes:

- anonymous `DECLARE ... BEGIN ... END; /` and `BEGIN ... END; /` blocks;
- `NUMBER`, `INTEGER`, `VARCHAR2`, `VARCHAR`, `CHAR`, and `BOOLEAN` variables;
- `:=`, arithmetic, comparisons, boolean operators, and `||` concatenation;
- `DBMS_OUTPUT.PUT_LINE`;
- `IF`, `ELSIF`, `ELSE`, numeric `FOR`/`REVERSE`, `WHILE`, `LOOP`, and `EXIT WHEN`;
- SQL inside blocks and `SELECT ... INTO`;
- `NO_DATA_FOUND`, `TOO_MANY_ROWS`, `ZERO_DIVIDE`, and `OTHERS` handlers;
- persisted procedures with `IN` parameters and functions with `RETURN`;
- explicit cursors, cursor attributes, and cursor `FOR` loops;
- application-layer `BEFORE`/`AFTER` DML triggers.

Packages, dynamic SQL, advanced object types, and complete Oracle transaction semantics are unsupported. Unsupported syntax returns a structured error instead of being executed as JavaScript.

## Safety limits

The interpreter never uses `eval()` or `new Function()`. It enforces maximum input size, 10,000 loop iterations, 1,000 output lines, and 20 routine-call levels. These defaults can be configured with `MAX_ITERATIONS`, `MAX_OUTPUT_LINES`, `MAX_CALL_DEPTH`, and `MAX_ROWS` Worker variables.

## D1 migrations

From `webapp/`, apply the migrations to the configured database:

```bash
npx wrangler d1 migrations apply alumni-db --remote
```

`migrations/0001_alumni_schema.sql` creates and seeds the 14 Alumni relations. `migrations/0002_plsql_objects.sql` creates the persisted procedure, function, and trigger tables. Do not commit database credentials or secrets.

## API response for PL/SQL

`POST /api/query` accepts the same `{ "sql": "..." }` body as normal SQL. A successful block returns:

```json
{
  "ok": true,
  "kind": "plsql",
  "message": "PL/SQL block executed successfully.",
  "output": ["Total alumni: 5"],
  "rowsAffected": 0,
  "elapsedMs": 1
}
```

Example:

```sql
DECLARE
  total NUMBER;
BEGIN
  SELECT COUNT(*) INTO total FROM ALUMNI;
  IF total > 0 THEN
    DBMS_OUTPUT.PUT_LINE('Total alumni: ' || total);
  ELSE
    DBMS_OUTPUT.PUT_LINE('No alumni found');
  END IF;
END;
/
```

The frontend is not modified by this backend implementation; the existing Run action continues to call `/api/query`.
