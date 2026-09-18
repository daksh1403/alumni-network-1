import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../webapp/plsql/parser.js";
import { TriggerService } from "../webapp/plsql/triggers.js";
import { D1SqlExecutor } from "../webapp/plsql/sql-executor.js";
import { execute } from "../webapp/plsql/interpreter.js";
import { Environment } from "../webapp/plsql/environment.js";

function memoryDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...values) {
          this.values = values;
          return this;
        },
        async run() { rows.push({ sql, values: this.values }); return { meta: { changes: 1 } }; },
        async first() { return null; },
        async all() { return { results: [] }; },
      };
    },
  };
}

test("fires an application-layer trigger around DML", async () => {
  const db = memoryDb();
  const outputs = [];
  const routines = {
    async fire(event, tableName, timing) {
      if (event === "INSERT" && tableName === "ALUMNI" && timing === "AFTER") outputs.push("Alumni inserted");
    },
  };
  const executor = new D1SqlExecutor(db, { triggers: routines });
  await executor.execute("INSERT INTO alumni (AlumniID) VALUES (99)");
  assert.deepEqual(outputs, ["Alumni inserted"]);
});

test("parses trigger definitions", () => {
  const definition = parse(`CREATE OR REPLACE TRIGGER alumni_insert_trigger AFTER INSERT ON alumni BEGIN DBMS_OUTPUT.PUT_LINE('Alumni inserted'); END; /`);
  assert.equal(definition.type, "TriggerDefinition");
  assert.equal(definition.event, "INSERT");
  assert.equal(definition.timing, "AFTER");
});

test("supports NEW bindings in trigger output expressions", async () => {
  const definition = parse(`BEGIN DBMS_OUTPUT.PUT_LINE(:NEW.FirstName); END;`);
  const environment = new Environment();
  environment.declare("NEW", { FIRSTNAME: "Aarav" });
  const result = await execute(definition, {
    environment,
    sql: { query: async () => ({ rows: [] }), selectInto: async () => ({ values: [] }), execute: async () => ({ rowsAffected: 0 }) },
  });
  assert.deepEqual(result.output, ["Aarav"]);
});
