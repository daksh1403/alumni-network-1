import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../webapp/plsql/parser.js";
import { execute } from "../webapp/plsql/interpreter.js";

const sql = {
  async query() { return { rows: [["Aarav"], ["Priya"]], columns: ["NAME"] }; },
  async selectInto() { return { values: [] }; },
  async execute() { return { rowsAffected: 0 }; },
};

test("executes explicit cursors and cursor attributes", async () => {
  const result = await execute(parse(`DECLARE CURSOR alumni_cursor IS SELECT name FROM alumni; alumni_name VARCHAR2(100); BEGIN OPEN alumni_cursor; LOOP FETCH alumni_cursor INTO alumni_name; EXIT WHEN alumni_cursor%NOTFOUND; DBMS_OUTPUT.PUT_LINE(alumni_name); END LOOP; CLOSE alumni_cursor; END;`), { sql });
  assert.deepEqual(result.output, ["Aarav", "Priya"]);
});

test("executes a cursor FOR loop", async () => {
  const result = await execute(parse(`BEGIN FOR rec IN (SELECT name FROM alumni) LOOP DBMS_OUTPUT.PUT_LINE(rec.name); END LOOP; END;`), { sql });
  assert.deepEqual(result.output, ["Aarav", "Priya"]);
});
