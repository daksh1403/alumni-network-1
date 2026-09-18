import test from "node:test";
import assert from "node:assert/strict";
import { D1SqlExecutor } from "../webapp/plsql/sql-executor.js";

function fakeDb(result) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push(sql);
      return {
        bind(...bindings) { calls.push(bindings); return this; },
        async all() { return result; },
        async run() { return result; },
      };
    },
  };
}

test("executes a query and normalizes D1 rows", async () => {
  const db = fakeDb({ results: [{ total: 5 }], meta: {} });
  const result = await new D1SqlExecutor(db).query("SELECT COUNT(*) AS total FROM alumni");
  assert.deepEqual(result, { columns: ["total"], rows: [[5]], objects: [{ total: 5 }] });
  assert.match(db.calls[0], /SELECT COUNT/);
});

test("selectInto rejects zero and multiple rows", async () => {
  const noRows = new D1SqlExecutor(fakeDb({ results: [], meta: {} }));
  await assert.rejects(() => noRows.selectInto("SELECT id FROM alumni", ["id"]), { code: "NO_DATA_FOUND" });

  const manyRows = new D1SqlExecutor(fakeDb({ results: [{ id: 1 }, { id: 2 }], meta: {} }));
  await assert.rejects(() => manyRows.selectInto("SELECT id FROM alumni", ["id"]), { code: "TOO_MANY_ROWS" });
});

test("executes mutations and returns affected rows", async () => {
  const executor = new D1SqlExecutor(fakeDb({ results: [], meta: { changes: 2 } }));
  assert.deepEqual(await executor.execute("UPDATE alumni SET IsActive = 0"), { rowsAffected: 2 });
});
