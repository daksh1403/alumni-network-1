import test from "node:test";
import assert from "node:assert/strict";
import { detectStatementType } from "../webapp/plsql/detect.js";

test("detects normal SQL without matching words inside strings", () => {
  assert.equal(detectStatementType("SELECT 'BEGIN' AS value;"), "SQL");
});

test("detects anonymous PL/SQL blocks with and without declarations", () => {
  assert.equal(detectStatementType("DECLARE x NUMBER := 1; BEGIN NULL; END; /"), "PLSQL_BLOCK");
  assert.equal(detectStatementType("BEGIN NULL; END;"), "PLSQL_BLOCK");
});

test("detects stored routine definitions", () => {
  assert.equal(detectStatementType("CREATE OR REPLACE PROCEDURE greet IS BEGIN NULL; END; /"), "PROCEDURE");
  assert.equal(detectStatementType("CREATE OR REPLACE FUNCTION f RETURN NUMBER IS BEGIN RETURN 1; END; /"), "FUNCTION");
  assert.equal(detectStatementType("CREATE OR REPLACE TRIGGER t AFTER INSERT ON alumni BEGIN NULL; END; /"), "TRIGGER");
});

test("ignores comments and whitespace while detecting", () => {
  assert.equal(detectStatementType("-- comment\n /* x */ begin null; end; /"), "PLSQL_BLOCK");
  assert.equal(detectStatementType("   "), "SQL");
});
