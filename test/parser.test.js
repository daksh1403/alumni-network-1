import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../webapp/plsql/parser.js";

test("parses declarations, assignment, output, and conditionals", () => {
  const ast = parse(`DECLARE
    total NUMBER := 2;
  BEGIN
    total := total + 3;
    DBMS_OUTPUT.PUT_LINE('Total: ' || total);
    IF total >= 5 THEN
      DBMS_OUTPUT.PUT_LINE('ok');
    ELSE
      DBMS_OUTPUT.PUT_LINE('bad');
    END IF;
  END; /`);
  assert.equal(ast.type, "Block");
  assert.equal(ast.declarations[0].name, "TOTAL");
  assert.equal(ast.body[1].type, "OutputStatement");
  assert.equal(ast.body[2].type, "IfStatement");
});

test("parses all loop forms", () => {
  const ast = parse(`BEGIN
    FOR i IN REVERSE 1..3 LOOP NULL; END LOOP;
    WHILE i < 4 LOOP i := i + 1; END LOOP;
    LOOP EXIT WHEN i > 5; END LOOP;
  END;`);
  assert.deepEqual(ast.body.map((statement) => statement.type), ["ForLoop", "WhileLoop", "Loop"]);
});

test("parses select into and exception handlers", () => {
  const ast = parse(`DECLARE total NUMBER;
  BEGIN
    SELECT COUNT(*) INTO total FROM alumni;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('none');
    WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('error');
  END; /`);
  assert.equal(ast.body[0].type, "SelectIntoStatement");
  assert.equal(ast.exception.handlers.length, 2);
  assert.match(ast.body[0].sql, /SELECT COUNT \( \* \) FROM ALUMNI/);
});
