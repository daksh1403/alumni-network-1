# D1 PL/SQL Compatibility Layer Design

## Goal

Extend `alumni-network-1` so the existing Cloudflare Worker SQL console supports a safe, educational subset of Oracle-style PL/SQL while preserving all existing D1 SQL behavior.

This is a compatibility layer implemented by the Worker. It is not an Oracle runtime and does not send PL/SQL text directly to D1.

## Context and source of truth

The repository currently contains a vanilla JavaScript Cloudflare Worker, a static SQL-console frontend, and D1 API routes. The predecessor `alumni-network` repository is the source for the 14-table Alumni schema, seed records, SQL examples, and current UI conventions. The target remains Cloudflare Workers + D1.

## Architecture

```text
POST /api/query
  -> request validation and statement detection
  -> SQL: existing D1 executor
  -> PL/SQL: tokenizer -> parser -> AST -> interpreter
                         |       |       |
                         |       |       +-- scoped Environment
                         |       +---------- D1 SQL executor
                         +------------------ persisted routine/trigger services
```

New Worker modules will remain small and separated by responsibility:

- `webapp/plsql/tokenizer.js`: lexical tokens, source locations, comments, literals, operators, keywords.
- `webapp/plsql/parser.js`: recursive-descent parser producing explicit AST nodes.
- `webapp/plsql/expressions.js`: literals, variables, arithmetic, comparisons, boolean logic, `||`, and routine calls.
- `webapp/plsql/environment.js`: case-insensitive variables, nested scopes, declaration and lookup errors.
- `webapp/plsql/interpreter.js`: statement execution, output collection, limits, and control flow.
- `webapp/plsql/sql-executor.js`: the only boundary for D1 queries and mutations used by PL/SQL.
- `webapp/plsql/procedures.js`, `functions.js`, `cursors.js`, `triggers.js`, and `exceptions.js`: persistence and feature-specific runtime behavior.
- `webapp/plsql/detect.js`: `SQL`, `PLSQL_BLOCK`, `PROCEDURE`, `FUNCTION`, and `TRIGGER` classification.

## Supported language

### Phase 1: anonymous blocks and core expressions

- `DECLARE` and declaration-free `BEGIN ... END; /` blocks.
- `NUMBER`, `INTEGER`, `VARCHAR2`, `VARCHAR`, `CHAR`, and `BOOLEAN` declarations.
- initialization with `:=` and later assignment with `:=`.
- numeric, string, boolean, `NULL`, arithmetic, comparison, and concatenation expressions.
- `DBMS_OUTPUT.PUT_LINE` with literals, variables, and expressions.

### Phase 2: control flow

- `IF ... THEN ... ELSIF ... ELSE ... END IF`.
- numeric `FOR i IN lower..upper LOOP`, including `REVERSE`.
- `WHILE ... LOOP`.
- `LOOP ... EXIT WHEN ... END LOOP`.

### Phase 3: D1 integration and exceptions

- SQL statements inside blocks, including `INSERT`, `UPDATE`, and `DELETE`.
- `SELECT ... INTO variable ...` with `NO_DATA_FOUND` and `TOO_MANY_ROWS` mapping.
- `ZERO_DIVIDE` and `OTHERS` exception handlers.
- structured errors with source line/context where available.

### Phase 4: persisted routines

- `CREATE OR REPLACE PROCEDURE` with basic `IN` parameters.
- procedure invocation from a block.
- `CREATE OR REPLACE FUNCTION`, `RETURN type`, `RETURN expression`, and function calls in expressions.
- D1 persistence in `plsql_procedures` and `plsql_functions`.

### Phase 5: cursors

- cursor declarations with a `SELECT` query.
- `OPEN`, `FETCH ... INTO`, `CLOSE`.
- `%FOUND`, `%NOTFOUND`, and `%ROWCOUNT`.
- cursor `FOR` loops over inline `SELECT` queries.

### Phase 6: application-layer triggers

- persisted `BEFORE/AFTER INSERT`, `UPDATE`, and `DELETE` triggers.
- trigger execution around normal D1 DML and DML inside PL/SQL.
- optional `:NEW.column` and `:OLD.column` bindings where the event supplies them.

Unsupported constructs will produce `UnsupportedFeature` errors rather than being approximated silently. Packages, dynamic SQL, advanced object types, and full Oracle semantics are out of scope.

## Statement detection and execution

`detectStatementType(sql)` will tokenize the leading statement and return one of the supported categories. It will recognize `DECLARE`, `BEGIN`, and `CREATE OR REPLACE PROCEDURE/FUNCTION/TRIGGER` without treating arbitrary substrings as PL/SQL.

Normal SQL continues through the existing D1 path. PL/SQL definitions are stored after successful parsing and validation. Anonymous blocks are parsed and interpreted immediately. Embedded SQL is executed through prepared D1 statements and returns normalized values to the interpreter.

PL/SQL responses will retain the existing JSON contract and add:

```json
{
  "ok": true,
  "kind": "plsql",
  "message": "PL/SQL block executed successfully.",
  "output": ["..."],
  "rowsAffected": 0,
  "elapsedMs": 1
}
```

## Persistence migrations

Add D1 migrations for:

- the 14 Alumni tables and indexes copied from the predecessor repository;
- `plsql_procedures(id, name, parameters, source_code, created_at, updated_at)`;
- `plsql_functions(id, name, parameters, return_type, source_code, created_at, updated_at)`;
- `plsql_triggers(id, name, event, timing, table_name, source_code, enabled, created_at, updated_at)`.

Names are normalized case-insensitively and constrained to prevent duplicate definitions. Source code is stored for educational inspection and re-parsed on invocation.

## Safety limits

The interpreter will enforce configurable defaults:

- maximum loop iterations: 10,000;
- maximum output lines: 1,000;
- maximum procedure/function call depth: 20;
- maximum input size and execution duration appropriate for Worker limits.

No user text is converted into JavaScript source. No `eval`, `new Function`, dynamic imports, or arbitrary host calls are permitted.

## Frontend and documentation

Reuse the current editor and Run action. Add an automatically detected `Mode: SQL` / `Mode: PL/SQL` indicator, a DBMS Output section, and a compatibility notice. Add presets for the requested 14 PL/SQL examples. Update README documentation with supported and limited syntax, architecture, migration setup, security limits, and copy-paste acceptance examples.

## Testing strategy

Use test-first development with a fake D1 adapter for deterministic Worker tests. Cover:

- detector, tokenizer, parser, expressions, scopes, and every requested statement form;
- output, loops, exceptions, SQL/DML, `SELECT INTO`, procedures, functions, cursors, and triggers;
- invalid syntax, undeclared variables, unsupported features, row cardinality errors, and safety limits;
- unchanged SQL behavior for SELECT, INSERT, UPDATE, DELETE, DDL, joins, CTEs, and window queries;
- API response shape and frontend preset/mode integration.

The live D1 deployment is not required for unit tests, but migration SQL will be checked for required tables and the target Worker API will be smoke-tested when credentials/bindings are available.

## Acceptance criteria

The two supplied acceptance blocks execute successfully, report DBMS Output, and query the Alumni tables through D1. Existing SQL statements continue to use D1 unchanged. Procedures, functions, cursors, and triggers persist across requests. Unsupported Oracle features fail clearly and safely. No secrets are added to the repository.
