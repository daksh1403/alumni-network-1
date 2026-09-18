# D1 PL/SQL Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe Oracle-style PL/SQL compatibility interpreter to the Cloudflare Worker while preserving existing D1 SQL behavior and leaving the frontend unchanged.

**Architecture:** `worker.js` will classify requests before execution. Normal SQL stays on D1. PL/SQL is tokenized, parsed into an AST, and interpreted with explicit scopes and a narrow D1 executor. Procedures, functions, and triggers are persisted in D1 tables and re-parsed on use.

**Tech Stack:** Cloudflare Workers, D1, JavaScript ES modules, Node built-in test runner, Wrangler migrations.

## Global Constraints

- Do not modify frontend files under `webapp/static/`.
- Do not send PL/SQL directly to D1.
- Do not use `eval`, `new Function`, dynamic imports, or generated JavaScript.
- Preserve `/api/health`, `/api/schema`, `/api/stats`, and `/api/query`.
- Enforce loop limit 10,000, output limit 1,000, call depth 20, and request-size limits.
- Support Oracle-style syntax as an educational compatibility layer, not full Oracle semantics.
- Use the predecessor `alumni-network` repository's schema and seed data as the D1 source.

## File Map

- Create `webapp/plsql/errors.js`: typed user-facing interpreter errors.
- Create `webapp/plsql/detect.js`: statement classification.
- Create `webapp/plsql/tokenizer.js`: token stream with source positions.
- Create `webapp/plsql/parser.js`: AST parser for blocks, expressions, SQL, routines, and triggers.
- Create `webapp/plsql/environment.js`: case-insensitive nested scopes.
- Create `webapp/plsql/expressions.js`: safe expression evaluation.
- Create `webapp/plsql/sql-executor.js`: D1 query/mutation adapter and `SELECT INTO` cardinality.
- Create `webapp/plsql/interpreter.js`: AST execution, exceptions, loops, output, cursors, routines.
- Create `webapp/plsql/routines.js`: procedure/function persistence and invocation.
- Create `webapp/plsql/triggers.js`: trigger persistence and DML event execution.
- Create `migrations/0001_alumni_schema.sql`: predecessor 14-table D1 schema and seed data.
- Create `migrations/0002_plsql_objects.sql`: procedures, functions, triggers.
- Create `test/*.test.js`: unit and Worker API tests with a fake D1 adapter.
- Create `webapp/package.json`: test and syntax-check scripts.
- Modify `webapp/worker.js`: route normal SQL and PL/SQL, preserve existing endpoints.
- Modify `README.md`: backend PL/SQL compatibility documentation only.

### Task 1: Test harness and statement detection

**Files:** `webapp/package.json`, `webapp/plsql/errors.js`, `webapp/plsql/detect.js`, `test/detect.test.js`

- [ ] Write failing tests for SQL, anonymous blocks, procedures, functions, triggers, trailing slash, comments, and empty input.
- [ ] Run `cd webapp && npm test`; confirm the detector module is missing.
- [ ] Implement token-aware leading classification with `detectStatementType(sql)` returning `SQL`, `PLSQL_BLOCK`, `PROCEDURE`, `FUNCTION`, or `TRIGGER`.
- [ ] Run the focused tests and commit `feat: add PL/SQL statement detection`.

### Task 2: Tokenizer, AST parser, and environment

**Files:** `webapp/plsql/tokenizer.js`, `webapp/plsql/parser.js`, `webapp/plsql/environment.js`, `test/parser.test.js`, `test/environment.test.js`

- [ ] Write failing tests for declarations, literals, operators, assignments, output calls, `IF`, loops, `SELECT INTO`, exception blocks, cursor declarations, and routine definitions.
- [ ] Run the focused tests and verify expected parser failures.
- [ ] Implement source-positioned tokens, quoted strings with doubled quotes, identifiers, numbers, operators including `:=`, `..`, `||`, and `/` terminator handling.
- [ ] Implement recursive-descent AST nodes without regex-based whole-program rewriting.
- [ ] Implement case-insensitive `Environment` with `declare`, `get`, `set`, and `child`.
- [ ] Run focused tests and commit `feat: add PL/SQL tokenizer parser and scopes`.

### Task 3: Safe expressions and anonymous execution

**Files:** `webapp/plsql/expressions.js`, `webapp/plsql/interpreter.js`, `test/interpreter-core.test.js`

- [ ] Write failing tests for numeric/string/boolean expressions, `||`, assignments, `DBMS_OUTPUT.PUT_LINE`, `IF/ELSIF/ELSE`, numeric `FOR`, reverse `FOR`, `WHILE`, `LOOP`, and `EXIT WHEN`.
- [ ] Run the focused tests and confirm they fail before implementation.
- [ ] Implement an explicit expression evaluator over AST nodes; map division by zero to `ZERO_DIVIDE`.
- [ ] Implement statement execution with output and loop/call limits, never executing source as JavaScript.
- [ ] Run focused tests and commit `feat: execute core PL/SQL blocks`.

### Task 4: D1 schema and SQL execution boundary

**Files:** `migrations/0001_alumni_schema.sql`, `webapp/plsql/sql-executor.js`, `test/sql-executor.test.js`

- [ ] Write failing tests for schema migration contents, normal D1 query/mutation calls, `SELECT INTO`, zero rows, multiple rows, and DML result counts.
- [ ] Run tests and confirm migration/adapter behavior is absent.
- [ ] Port the 14 tables, indexes, and seed records from the predecessor repository using idempotent D1-compatible SQL.
- [ ] Implement `D1SqlExecutor` with prepared statements, normalized rows, `selectInto`, and mutation methods.
- [ ] Run focused tests and commit `feat: add D1 schema and PL/SQL SQL boundary`.

### Task 5: SQL inside blocks and exceptions

**Files:** `webapp/plsql/interpreter.js`, `webapp/plsql/parser.js`, `test/sql-in-block.test.js`

- [ ] Write failing tests for `SELECT INTO`, INSERT, UPDATE, DELETE, `NO_DATA_FOUND`, `TOO_MANY_ROWS`, `ZERO_DIVIDE`, and `WHEN OTHERS`.
- [ ] Implement SQL statement parsing that preserves SQL text until the statement terminator and routes it only through `D1SqlExecutor`.
- [ ] Implement exception-region unwinding and handler matching.
- [ ] Run focused tests and commit `feat: support SQL and exceptions in PL/SQL`.

### Task 6: Persisted procedures and functions

**Files:** `migrations/0002_plsql_objects.sql`, `webapp/plsql/routines.js`, `webapp/plsql/interpreter.js`, `test/routines.test.js`

- [ ] Write failing tests for create-or-replace persistence, procedure calls with `IN` parameters, functions with `RETURN`, missing routines, and call-depth protection.
- [ ] Implement D1-backed routine repositories with normalized names and source re-parsing.
- [ ] Implement child environments for routine parameters and function return control flow.
- [ ] Run focused tests and commit `feat: add persisted PL/SQL procedures and functions`.

### Task 7: Cursors

**Files:** `webapp/plsql/cursors.js`, `webapp/plsql/parser.js`, `webapp/plsql/interpreter.js`, `test/cursors.test.js`

- [ ] Write failing tests for cursor declaration/open/fetch/close, `%FOUND`, `%NOTFOUND`, `%ROWCOUNT`, and cursor-for loops.
- [ ] Implement cursor state objects backed by `D1SqlExecutor` query results and row environments for cursor-for records.
- [ ] Run focused tests and commit `feat: support PL/SQL cursors`.

### Task 8: Application-layer triggers

**Files:** `webapp/plsql/triggers.js`, `webapp/plsql/sql-executor.js`, `webapp/worker.js`, `test/triggers.test.js`

- [ ] Write failing tests for trigger persistence and before/after insert/update/delete execution, including basic `:NEW` and `:OLD` bindings.
- [ ] Implement trigger repository and event dispatcher around supported DML operations.
- [ ] Ensure trigger failures roll back the current D1 mutation where D1 permits transactional batching.
- [ ] Run focused tests and commit `feat: add application-layer PL/SQL triggers`.

### Task 9: Worker integration and response contract

**Files:** `webapp/worker.js`, `test/worker.test.js`

- [ ] Write failing API tests for unchanged SQL responses, PL/SQL responses, errors, request-size limits, and CORS behavior.
- [ ] Route `SQL` to the existing D1 path and all PL/SQL categories to the interpreter/services.
- [ ] Return `kind: "plsql"`, success message, output lines, affected rows, elapsed time, and sanitized errors.
- [ ] Run all Worker tests and commit `feat: integrate PL/SQL with Worker API`.

### Task 10: Documentation and final verification

**Files:** `README.md`, `webapp/wrangler.jsonc`, `.gitignore` if needed

- [ ] Add only backend documentation: migrations, supported Oracle-style syntax, limitations, safety limits, API examples, and D1 setup.
- [ ] Verify no frontend files changed with `git diff --name-only`.
- [ ] Run `node --check` on every Worker module and `cd webapp && npm test`.
- [ ] Run a final repository search for `eval(`, `new Function`, committed credentials, and accidental frontend modifications.
- [ ] Commit `docs: document D1 PL/SQL compatibility layer`.

## Final verification commands

```bash
cd /Users/dakshagarwal/alumni-network-1
git diff --check
find webapp -name '*.js' -not -path 'webapp/static/*' -print0 | xargs -0 -n1 node --check
cd webapp && npm test
```

Expected result: all tests pass, all non-frontend Worker modules parse, and the final diff contains no files under `webapp/static/`.
