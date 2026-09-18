import test from "node:test";
import assert from "node:assert/strict";
import worker from "../webapp/worker.js";

function env() {
  return {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async first() { return sql.includes("COUNT") ? { count: 5 } : { ok: 1 }; },
          async all() {
            if (sql.includes("sqlite_master")) return { results: [{ name: "ALUMNI", sql: "CREATE TABLE ALUMNI (AlumniID INTEGER PRIMARY KEY, FirstName TEXT)" }] };
            if (sql.includes("COUNT")) return { results: [{ count: 5 }] };
            return { results: [{ AlumniID: 1 }, { AlumniID: 2 }] };
          },
          async run() { return { meta: { changes: 1 } }; },
        };
      },
    },
    ASSETS: { fetch: async () => new Response("ok") },
    MAX_ROWS: "1",
  };
}

test("keeps normal SQL on D1 and preserves query response shape", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/query", { method: "POST", body: JSON.stringify({ sql: "SELECT AlumniID FROM ALUMNI" }) }), env());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.kind, "query");
  assert.equal(body.rowCount, 1);
  assert.equal(body.truncated, true);
});

test("executes an anonymous PL/SQL block through the interpreter", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/query", { method: "POST", body: JSON.stringify({ sql: "BEGIN DBMS_OUTPUT.PUT_LINE('Hello World'); END; /" }) }), env());
  const body = await response.json();
  assert.equal(body.kind, "plsql");
  assert.deepEqual(body.output, ["Hello World"]);
});

test("rejects oversized statements and handles CORS preflight", async () => {
  const oversized = await worker.fetch(new Request("https://example.test/api/query", { method: "POST", body: JSON.stringify({ sql: "x".repeat(131073) }) }), env());
  assert.equal(oversized.status, 413);
  const preflight = await worker.fetch(new Request("https://example.test/api/query", { method: "OPTIONS" }), env());
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");
});
