import { parse } from "./parser.js";
import { execute } from "./interpreter.js";
import { Environment } from "./environment.js";

export class TriggerService {
  constructor(db) {
    this.db = db;
  }

  async save(definition, source) {
    await this.db.prepare(`INSERT INTO plsql_triggers (name, event, timing, table_name, source_code, enabled, updated_at) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP) ON CONFLICT(name) DO UPDATE SET event=excluded.event, timing=excluded.timing, table_name=excluded.table_name, source_code=excluded.source_code, enabled=1, updated_at=CURRENT_TIMESTAMP`)
      .bind(definition.name, definition.event, definition.timing, definition.tableName, source)
      .run();
    return { ok: true, name: definition.name };
  }

  async fire(event, tableName, timing, bindings = {}) {
    const rows = await this.db.prepare("SELECT name, source_code FROM plsql_triggers WHERE event = ? COLLATE NOCASE AND table_name = ? COLLATE NOCASE AND timing = ? COLLATE NOCASE AND enabled = 1")
      .bind(event, tableName, timing).all();
    for (const row of rows.results ?? []) {
      const definition = parse(row.source_code);
      const environment = new Environment();
      if (bindings.NEW) environment.declare("NEW", bindings.NEW);
      if (bindings.OLD) environment.declare("OLD", bindings.OLD);
      await execute(definition.body, { environment, sql: this.sql ?? { execute: async () => ({ rowsAffected: 0 }), query: async () => ({ rows: [] }), selectInto: async () => ({ values: [] }) } });
    }
  }
}
