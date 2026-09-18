import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../webapp/plsql/parser.js";
import { execute } from "../webapp/plsql/interpreter.js";

function sqlStub({ selectRows = [], affected = 0 } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql) { calls.push(["query", sql]); return { rows: selectRows, columns: [] }; },
    async selectInto() { if (!selectRows.length) { const error = new Error("missing"); error.code = "NO_DATA_FOUND"; throw error; } return { values: [selectRows[0][0] ?? Object.values(selectRows[0])[0]] }; },
    async execute(sql) { calls.push(["execute", sql]); return { rowsAffected: affected }; },
  };
}

test("executes SELECT INTO and DML inside a block", async () => {
  const sql = sqlStub({ selectRows: [{ total: 5 }], affected: 1 });
  const result = await execute(parse(`DECLARE total NUMBER; BEGIN SELECT COUNT(*) INTO total FROM alumni; INSERT INTO alumni (AlumniID) VALUES (99); UPDATE alumni SET IsActive = 0; DELETE FROM alumni WHERE AlumniID = 99; DBMS_OUTPUT.PUT_LINE(total); END;`), { sql });
  assert.deepEqual(result.output, ["5"]);
  assert.equal(result.rowsAffected, 3);
  assert.equal(sql.calls.length, 3);
});

test("maps SELECT INTO errors to handlers", async () => {
  const sql = sqlStub();
  const result = await execute(parse(`DECLARE total NUMBER; BEGIN SELECT COUNT(*) INTO total FROM alumni; EXCEPTION WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('No alumni found'); WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('bad'); END;`), { sql });
  assert.deepEqual(result.output, ["No alumni found"]);
});

test("maps zero divide to ZERO_DIVIDE", async () => {
  const sql = sqlStub();
  const result = await execute(parse(`BEGIN DBMS_OUTPUT.PUT_LINE(1 / 0); EXCEPTION WHEN ZERO_DIVIDE THEN DBMS_OUTPUT.PUT_LINE('cannot divide'); END;`), { sql });
  assert.deepEqual(result.output, ["cannot divide"]);
});
