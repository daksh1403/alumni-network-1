import { NoDataFoundError, TooManyRowsError } from "./errors.js";

export class D1SqlExecutor {
  constructor(db, { triggers = null } = {}) {
    this.db = db;
    this.triggers = triggers;
  }

  async query(sql) {
    const result = await this.db.prepare(sql).all();
    const objects = result.results ?? [];
    const columns = objects.length ? Object.keys(objects[0]) : [];
    return { columns, rows: objects.map((row) => columns.map((column) => row[column])), objects };
  }

  async selectInto(sql, targets) {
    const result = await this.query(sql);
    if (result.objects.length === 0) throw new NoDataFoundError();
    if (result.objects.length > 1) throw new TooManyRowsError();
    const row = result.objects[0];
    return { values: targets.map((target, index) => row[result.columns[index]] ?? row[target] ?? Object.values(row)[index]) };
  }

  async execute(sql) {
    const event = sql.match(/^\s*(INSERT|UPDATE|DELETE)\s+(?:INTO\s+)?([A-Za-z_][A-Za-z0-9_$]*)/i);
    if (event && this.triggers) await this.triggers.fire(event[1].toUpperCase(), event[2].toUpperCase(), "BEFORE");
    const result = await this.db.prepare(sql).run();
    if (event && this.triggers) await this.triggers.fire(event[1].toUpperCase(), event[2].toUpperCase(), "AFTER");
    return { rowsAffected: result.meta?.changes ?? result.meta?.rows_written ?? 0 };
  }
}
