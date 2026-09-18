import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../webapp/plsql/parser.js";
import { execute } from "../webapp/plsql/interpreter.js";

const run = (source) => execute(parse(source), { sql: { query: async () => ({ rows: [], columns: [] }), execute: async () => ({ rowsAffected: 0 }) } });

test("executes variables, assignment, concatenation, and DBMS_OUTPUT", async () => {
  const result = await run(`DECLARE total NUMBER := 2; BEGIN total := total + 3; DBMS_OUTPUT.PUT_LINE('Total: ' || total); END; /`);
  assert.deepEqual(result.output, ["Total: 5"]);
});

test("executes IF/ELSIF/ELSE", async () => {
  const result = await run(`DECLARE marks NUMBER := 80; BEGIN IF marks >= 75 THEN DBMS_OUTPUT.PUT_LINE('Distinction'); ELSIF marks >= 50 THEN DBMS_OUTPUT.PUT_LINE('Pass'); ELSE DBMS_OUTPUT.PUT_LINE('Fail'); END IF; END;`);
  assert.deepEqual(result.output, ["Distinction"]);
});

test("executes FOR, REVERSE, WHILE, and EXIT WHEN loops", async () => {
  const result = await run(`DECLARE i NUMBER := 1; BEGIN FOR n IN 1..3 LOOP DBMS_OUTPUT.PUT_LINE(n); END LOOP; FOR n IN REVERSE 1..2 LOOP DBMS_OUTPUT.PUT_LINE(n); END LOOP; WHILE i <= 2 LOOP DBMS_OUTPUT.PUT_LINE(i); i := i + 1; END LOOP; LOOP i := i + 1; EXIT WHEN i > 4; END LOOP; END;`);
  assert.deepEqual(result.output, ["1", "2", "3", "2", "1", "1", "2"]);
});

test("protects against excessive loop iterations", async () => {
  await assert.rejects(() => run(`DECLARE i NUMBER := 1; BEGIN WHILE i = 1 LOOP NULL; END LOOP; END;`), /iteration limit/i);
});
