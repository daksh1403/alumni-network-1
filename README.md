# Alumni Network SQL Console

An educational SQL console for exploring an Alumni Network database through a browser. The application runs on Cloudflare Workers and Cloudflare D1, supports relational SQL, and includes a safe application-level interpreter for commonly taught Oracle-style PL/SQL.

> **Important:** The PL/SQL feature is an educational compatibility layer implemented in JavaScript. It is not an Oracle Database runtime, and PL/SQL is never sent directly to D1.

## Live application

[Open the Alumni SQL Console](https://alumni-sql-console.dakshx.workers.dev/)

## Table of contents

- [Project overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Database schema](#database-schema)
- [Getting started](#getting-started)
- [D1 migrations](#d1-migrations)
- [API reference](#api-reference)
- [SQL support](#sql-support)
- [PL/SQL compatibility](#plsql-compatibility)
- [Example programs](#example-programs)
- [Testing](#testing)
- [Security and execution limits](#security-and-execution-limits)
- [Project structure](#project-structure)
- [Limitations and future work](#limitations-and-future-work)

## Project overview

The Alumni Network SQL Console models alumni, students, departments, companies, skills, events, donations, jobs, and mentorship relationships. It is designed as a DBMS learning project: students can inspect the schema, run queries, practice DDL/DML, and execute PL/SQL-style laboratory programs against the same database.

The original SQL console behavior is preserved:

- normal SQL is executed by Cloudflare D1's SQLite engine;
- query results are returned as columns and rows;
- DML and DDL return execution metadata;
- the schema browser and existing browser console continue using `/api/query`;
- the existing frontend is intentionally unchanged by the backend implementation.

## Features

### SQL console

- Interactive browser-based SQL terminal.
- Query history and keyboard shortcuts.
- Schema inspection through `/api/schema`.
- Database statistics through `/api/stats`.
- Preset queries for alumni directory, events, mentorship, jobs, donations, joins, subqueries, functions, and window operations.
- Results returned in a tabular JSON format.

### Relational SQL

The database supports the SQL topics expected in a DBMS laboratory:

- **DQL:** `SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`, `HAVING`, `DISTINCT`.
- **DML:** `INSERT`, `UPDATE`, `DELETE`.
- **DDL:** `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, indexes, and views.
- **Advanced SQL:** joins, subqueries, common table expressions, aggregate functions, set operations, and window functions.

### Oracle-style PL/SQL compatibility

Because D1 is SQLite-based, it cannot execute Oracle PL/SQL directly. The Worker detects PL/SQL statements and sends them through a tokenizer, parser, AST interpreter, and scoped execution environment. SQL statements embedded inside PL/SQL are sent to D1 through a dedicated database adapter.

Supported examples include variables, assignments, `DBMS_OUTPUT.PUT_LINE`, conditions, loops, `SELECT INTO`, exceptions, procedures, functions, cursors, and application-layer triggers.

## Architecture

```text
Browser
  |
  | GET /api/health, /api/schema, /api/stats
  | POST /api/query
  v
Cloudflare Worker
  |
  +-- SQL ----------------------> D1 prepared statement
  |
  +-- PL/SQL detection
        |
        +--> tokenizer -> parser -> AST -> interpreter
                                      |
                                      +--> D1 SQL executor
                                      +--> routine repository
                                      +--> trigger repository
  v
JSON response
```

### Normal SQL flow

Normal SQL remains on the existing D1 path. The Worker executes the submitted statement through `env.DB.prepare(...)`, returns rows for row-producing statements, and returns affected-row metadata for mutations.

### PL/SQL flow

PL/SQL is never converted into JavaScript and is never evaluated dynamically. The interpreter executes only AST nodes that it explicitly supports. Variables are stored in case-insensitive nested environments, and database access is isolated behind `D1SqlExecutor`.

## Technology stack

| Layer | Technology |
| --- | --- |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 / SQLite |
| Backend | JavaScript ES modules |
| Frontend | Existing HTML, CSS, and vanilla JavaScript console |
| Deployment | Wrangler |
| Tests | Node.js built-in test runner |
| Local Flask support | Existing Python backend retained for local/reference use |

## Database schema

The first D1 migration creates and seeds 14 normalized relations.

| Relation | Purpose | Primary key |
| --- | --- | --- |
| `DEPARTMENT` | Academic departments | `DeptID` |
| `BATCH` | Graduation batches | `BatchID` |
| `COMPANY` | Employer companies | `CompanyID` |
| `SKILL` | Skills catalog | `SkillID` |
| `ALUMNI` | Alumni profile and employment data | `AlumniID` |
| `ALUMNI_PHONE` | Multiple phone numbers per alumnus | `AlumniID, PhoneNumber` |
| `STUDENT` | Current student information | `StudentID` |
| `STUDENT_EMAIL` | Multiple email addresses per student | `StudentID, Email` |
| `MENTORSHIP` | Alumni-student mentorship relationships | `AlumniID, MentorshipID` |
| `EVENT` | Alumni events and reunions | `EventID` |
| `DONATION` | Financial contributions | `DonationID` |
| `JOB` | Job postings | `JobID` |
| `ALUMNI_SKILL` | Alumni-skill many-to-many mapping | `AlumniID, SkillID` |
| `ALUMNI_EVENT` | Alumni-event attendance mapping | `AlumniID, EventID` |

The schema includes primary keys, foreign keys, uniqueness constraints, checks for values such as CGPA and active status, cascading deletes where appropriate, and indexes on frequently joined foreign keys.

## Getting started

### Prerequisites

- Node.js 18 or newer.
- A Cloudflare account for deployment.
- Wrangler authenticated with `npx wrangler login`.
- A D1 database configured in `webapp/wrangler.jsonc`.

### Install and run tests

```bash
git clone https://github.com/daksh1403/alumni-network-1.git
cd alumni-network-1/webapp
npm test
```

The test suite uses fake D1 adapters, so it does not require a live Cloudflare database.

### Local Worker development

From `webapp/`:

```bash
npx wrangler dev
```

Wrangler serves the static console and Worker API locally. The D1 binding is configured by the Wrangler project configuration.

### Deploy the Worker

From `webapp/`:

```bash
npx wrangler deploy
```

The deployed Worker serves both the existing static frontend and the backend API. Deployment credentials should be supplied through Wrangler or the environment, never committed to this repository.

## D1 migrations

Apply the schema to the configured D1 database before using the SQL or PL/SQL examples:

```bash
cd webapp
npx wrangler d1 migrations apply alumni-db --local
npx wrangler d1 migrations apply alumni-db --remote
```

The migrations are:

- `migrations/0001_alumni_schema.sql` — Alumni Network tables, indexes, and seed data.
- `migrations/0002_plsql_objects.sql` — persisted procedures, functions, and triggers.

The migrations are idempotent for the schema and seed records. The Worker expects the `DB` binding from `wrangler.jsonc`.

## API reference

All API responses are JSON. CORS headers are provided by the Worker.

### Health check

```http
GET /api/health
```

Example response:

```json
{
  "ok": true,
  "engine": "Cloudflare D1 (SQLite)",
  "database": "D1: alumni-db"
}
```

### Schema

```http
GET /api/schema
```

Returns table names, column names, column types, and primary-key columns.

### Statistics

```http
GET /api/stats
```

Returns record counts for the main Alumni Network entities.

### Query execution

```http
POST /api/query
Content-Type: application/json

{"sql":"SELECT * FROM ALUMNI ORDER BY AlumniID;"}
```

Normal SQL response:

```json
{
  "ok": true,
  "kind": "query",
  "columns": ["AlumniID", "FirstName", "LastName"],
  "rows": [[1, "Aarav", "Mehta"]],
  "rowCount": 1,
  "truncated": false,
  "elapsedMs": 2
}
```

DML/DDL response:

```json
{
  "ok": true,
  "kind": "execute",
  "message": "Statement executed. 1 row(s) affected.",
  "rowCount": 1,
  "elapsedMs": 2
}
```

## PL/SQL compatibility

### Supported syntax

| Area | Supported forms |
| --- | --- |
| Blocks | `DECLARE`, declaration-free `BEGIN ... END;`, optional `/` terminator |
| Variables | `NUMBER`, `INTEGER`, `VARCHAR2`, `VARCHAR`, `CHAR`, `BOOLEAN` |
| Assignment | `:=` |
| Output | `DBMS_OUTPUT.PUT_LINE(expression)` |
| Expressions | Arithmetic, comparisons, boolean operators, literals, `||` concatenation |
| Conditions | `IF`, `ELSIF`, `ELSE`, `END IF` |
| Loops | Numeric `FOR`, `REVERSE`, `WHILE`, `LOOP`, `EXIT WHEN` |
| Database | DML inside blocks and `SELECT ... INTO` |
| Exceptions | `NO_DATA_FOUND`, `TOO_MANY_ROWS`, `ZERO_DIVIDE`, `OTHERS` |
| Routines | Procedures with `IN` parameters and functions with `RETURN` |
| Cursors | Declaration, `OPEN`, `FETCH`, `CLOSE`, `%FOUND`, `%NOTFOUND`, `%ROWCOUNT` |
| Triggers | Application-layer `BEFORE`/`AFTER` insert, update, and delete hooks |

### Stored objects

Procedures, functions, and triggers are stored as source text in D1 and parsed again when invoked. This provides persistence across Worker requests without pretending that D1 supports native Oracle stored objects.

Persisted tables:

- `plsql_procedures`
- `plsql_functions`
- `plsql_triggers`

### Unsupported or limited features

The compatibility layer does not implement:

- Oracle packages and package state;
- dynamic SQL such as `EXECUTE IMMEDIATE`;
- advanced object types and collection types;
- full Oracle transaction and locking behavior;
- complete Oracle built-in function coverage;
- compiler-level type conversion and optimizer behavior;
- native Oracle triggers or Oracle database APIs.

Unsupported syntax produces a structured error instead of falling through to arbitrary JavaScript execution.

## Example programs

### Variables and output

```sql
DECLARE
  name VARCHAR2(50) := 'Daksh';
  total NUMBER := 5;
BEGIN
  DBMS_OUTPUT.PUT_LINE('Hello ' || name);
  DBMS_OUTPUT.PUT_LINE('Total: ' || total);
END;
/
```

### Conditional logic

```sql
DECLARE
  marks NUMBER := 80;
BEGIN
  IF marks >= 75 THEN
    DBMS_OUTPUT.PUT_LINE('Distinction');
  ELSIF marks >= 50 THEN
    DBMS_OUTPUT.PUT_LINE('Pass');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Fail');
  END IF;
END;
/
```

### Select into

```sql
DECLARE
  total NUMBER;
BEGIN
  SELECT COUNT(*) INTO total FROM ALUMNI;
  DBMS_OUTPUT.PUT_LINE('Total alumni: ' || total);
END;
/
```

### Loop

```sql
BEGIN
  FOR i IN 1..5 LOOP
    DBMS_OUTPUT.PUT_LINE('Iteration ' || i);
  END LOOP;
END;
/
```

### Exception handling

```sql
DECLARE
  alumni_id NUMBER;
BEGIN
  SELECT AlumniID INTO alumni_id
  FROM ALUMNI
  WHERE AlumniID = 999999;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    DBMS_OUTPUT.PUT_LINE('No alumni found');
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Something went wrong');
END;
/
```

### Procedure

```sql
CREATE OR REPLACE PROCEDURE greet_user(
  p_name IN VARCHAR2
)
IS
BEGIN
  DBMS_OUTPUT.PUT_LINE('Hello ' || p_name);
END;
/
```

Then execute it:

```sql
BEGIN
  greet_user('Daksh');
END;
/
```

### Function

```sql
CREATE OR REPLACE FUNCTION square_num(
  n NUMBER
)
RETURN NUMBER
IS
BEGIN
  RETURN n * n;
END;
/
```

```sql
DECLARE
  result NUMBER;
BEGIN
  result := square_num(5);
  DBMS_OUTPUT.PUT_LINE(result);
END;
/
```

## Testing

Run the complete backend test suite from `webapp/`:

```bash
npm test
```

The tests cover:

- statement detection;
- tokenization, parsing, and scoped variables;
- assignments, expressions, output, conditions, and loops;
- D1 query/mutation adapters and `SELECT INTO` cardinality errors;
- SQL and DML inside PL/SQL;
- exception handling;
- procedures and functions;
- explicit cursors and cursor-for loops;
- application-layer triggers;
- D1 migration contents;
- Worker routing, response formats, CORS, and request-size limits.

Syntax-check Worker modules with:

```bash
find . -name '*.js' -not -path './static/*' -print0 | xargs -0 -n1 node --check
```

## Security and execution limits

The interpreter executes only supported AST nodes and does not use `eval()`, `new Function()`, dynamic imports, or generated JavaScript. SQL access is isolated in the D1 adapter.

Default limits:

| Limit | Default |
| --- | ---: |
| Statement size | 128 KB |
| Loop iterations | 10,000 |
| DBMS Output lines | 1,000 |
| Routine call depth | 20 |
| SQL result rows | 1,000 |

Worker variables can override the interpreter limits:

- `MAX_ROWS`
- `MAX_ITERATIONS`
- `MAX_OUTPUT_LINES`
- `MAX_CALL_DEPTH`
- `ALLOWED_ORIGIN`

Do not commit D1 credentials, API tokens, `.dev.vars`, or other secrets.

## Project structure

```text
alumni-network-1/
├── README.md
├── docs/
│   └── superpowers/
│       ├── plans/
│       └── specs/
├── test/
│   ├── worker.test.js
│   ├── parser.test.js
│   ├── interpreter-core.test.js
│   ├── sql-in-block.test.js
│   ├── routines.test.js
│   ├── cursors.test.js
│   └── triggers.test.js
└── webapp/
    ├── worker.js                 # Worker routing and API contract
    ├── wrangler.jsonc            # Worker and D1 configuration
    ├── migrations/                # D1 schema and PL/SQL object tables
    ├── plsql/                    # Tokenizer, parser, AST runtime, services
    ├── package.json
    ├── app.py                    # Existing local Flask/reference backend
    └── static/                   # Existing frontend; unchanged by this work
```

## Limitations and future work

- Add richer Oracle-compatible built-in functions and type conversion rules.
- Add more complete `OUT` and `IN OUT` parameter semantics.
- Improve trigger context propagation for complete `:NEW` and `:OLD` row images.
- Add transactional D1 batching for multi-statement trigger execution.
- Add a browser output panel in a future frontend-only change.
- Add live D1 smoke tests as part of deployment verification.

## License

This project is an academic DBMS application and learning resource.
