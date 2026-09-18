import test from "node:test";
import assert from "node:assert/strict";
import { Environment } from "../webapp/plsql/environment.js";
import { UndeclaredVariableError } from "../webapp/plsql/errors.js";

test("environment names are case insensitive and child scopes inherit values", () => {
  const root = new Environment();
  root.declare("Total", 3);
  const child = root.child();
  assert.equal(child.get("total"), 3);
  child.set("TOTAL", 4);
  assert.equal(root.get("total"), 4);
});

test("environment rejects undeclared variables", () => {
  assert.throws(() => new Environment().get("missing"), UndeclaredVariableError);
  assert.throws(() => new Environment().set("missing", 1), UndeclaredVariableError);
});
