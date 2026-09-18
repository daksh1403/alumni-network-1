import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../webapp/plsql/parser.js";
import { execute } from "../webapp/plsql/interpreter.js";
import { RoutineService } from "../webapp/plsql/routines.js";

function routineDb() {
  const records = { plsql_procedures: new Map(), plsql_functions: new Map() };
  return {
    records,
    prepare(sql) {
      return {
        bind(...values) {
          this.values = values;
          return this;
        },
        async run() {
          const table = sql.includes("plsql_functions") ? records.plsql_functions : records.plsql_procedures;
          table.set(String(this.values[0]).toUpperCase(), { name: this.values[0], source_code: this.values.at(-1) });
          return { meta: { changes: 1 } };
        },
        async first() {
          const table = sql.includes("plsql_functions") ? records.plsql_functions : records.plsql_procedures;
          return table.get(String(this.values[0]).toUpperCase()) ?? null;
        },
      };
    },
  };
}

test("parses procedure and function definitions", () => {
  const procedure = parse(`CREATE OR REPLACE PROCEDURE greet_user(p_name IN VARCHAR2) IS BEGIN DBMS_OUTPUT.PUT_LINE('Hello ' || p_name); END; /`);
  assert.equal(procedure.type, "ProcedureDefinition");
  assert.equal(procedure.parameters[0].name, "P_NAME");
  const func = parse(`CREATE OR REPLACE FUNCTION square_num(n NUMBER) RETURN NUMBER IS BEGIN RETURN n * n; END; /`);
  assert.equal(func.type, "FunctionDefinition");
  assert.equal(func.returnType, "NUMBER");
});

test("invokes a procedure through a routine service", async () => {
  const calls = [];
  const routines = {
    async callProcedure(name, args, environment, state) {
      calls.push([name, args.length]);
      environment.declare("RESULT", "called");
      state.output.push("called");
    },
  };
  const result = await execute(parse(`DECLARE result VARCHAR2(20); BEGIN greet_user('Daksh'); END;`), { routines, sql: { execute: async () => ({ rowsAffected: 0 }), query: async () => ({ rows: [] }), selectInto: async () => ({ values: [] }) } });
  assert.deepEqual(calls, [["GREET_USER", 1]]);
  assert.deepEqual(result.output, ["called"]);
});

test("persists and invokes a procedure and function", async () => {
  const db = routineDb();
  const routines = new RoutineService(db);
  const procedureSource = `CREATE OR REPLACE PROCEDURE greet_user(p_name IN VARCHAR2) IS BEGIN DBMS_OUTPUT.PUT_LINE('Hello ' || p_name); END; /`;
  const functionSource = `CREATE OR REPLACE FUNCTION square_num(n NUMBER) RETURN NUMBER IS BEGIN RETURN n * n; END; /`;
  await routines.save(parse(procedureSource), procedureSource);
  await routines.save(parse(functionSource), functionSource);
  const sql = { query: async () => ({ rows: [] }), selectInto: async () => ({ values: [] }), execute: async () => ({ rowsAffected: 0 }) };
  const result = await execute(parse(`DECLARE result NUMBER; BEGIN greet_user('Daksh'); result := square_num(5); DBMS_OUTPUT.PUT_LINE(result); END;`), { sql, routines });
  assert.deepEqual(result.output, ["Hello Daksh", "25"]);
});
