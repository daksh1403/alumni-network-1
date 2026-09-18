import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("D1 migrations include the Alumni schema and PL/SQL persistence tables", async () => {
  const schema = (await readFile(new URL("../webapp/migrations/0001_alumni_schema.sql", import.meta.url), "utf8")).toLowerCase();
  const routines = (await readFile(new URL("../webapp/migrations/0002_plsql_objects.sql", import.meta.url), "utf8")).toLowerCase();
  for (const table of ["department", "batch", "company", "skill", "alumni", "alumni_phone", "student", "student_email", "mentorship", "event", "donation", "job", "alumni_skill", "alumni_event"]) {
    assert.match(schema, new RegExp(`create table if not exists ${table}`));
  }
  for (const table of ["plsql_procedures", "plsql_functions", "plsql_triggers"]) {
    assert.match(routines, new RegExp(`create table if not exists ${table}`));
  }
  assert.match(schema, /insert or ignore into alumni/);
});
