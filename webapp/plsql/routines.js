import { parse } from "./parser.js";
import { execute } from "./interpreter.js";
import { Environment } from "./environment.js";
import { PlsqlError } from "./errors.js";

export class RoutineService {
  constructor(db) {
    this.db = db;
  }

  async save(definition, source) {
    const table = definition.type === "ProcedureDefinition" ? "plsql_procedures" : "plsql_functions";
    const fields = definition.type === "FunctionDefinition"
      ? "name, parameters, return_type, source_code, updated_at"
      : "name, parameters, source_code, updated_at";
    const values = definition.type === "FunctionDefinition"
      ? [definition.name, JSON.stringify(definition.parameters), definition.returnType, source]
      : [definition.name, JSON.stringify(definition.parameters), source];
    const placeholders = values.map(() => "?").join(", ");
    const sql = definition.type === "FunctionDefinition"
      ? `INSERT INTO ${table} (${fields}) VALUES (${placeholders}, CURRENT_TIMESTAMP) ON CONFLICT(name) DO UPDATE SET parameters=excluded.parameters, return_type=excluded.return_type, source_code=excluded.source_code, updated_at=CURRENT_TIMESTAMP`
      : `INSERT INTO ${table} (${fields}) VALUES (${placeholders}, CURRENT_TIMESTAMP) ON CONFLICT(name) DO UPDATE SET parameters=excluded.parameters, source_code=excluded.source_code, updated_at=CURRENT_TIMESTAMP`;
    await this.db.prepare(sql).bind(...values).run();
    return { ok: true, name: definition.name };
  }

  async callProcedure(name, argumentNodes, callerEnvironment, state) {
    const row = await this.db.prepare("SELECT name, source_code FROM plsql_procedures WHERE name = ? COLLATE NOCASE").bind(name).first();
    if (!row) throw new PlsqlError(`Procedure ${name} does not exist.`, "ROUTINE_NOT_FOUND");
    const definition = parse(row.source_code);
    const args = [];
    for (const node of argumentNodes) args.push(await state.evaluate(node, callerEnvironment));
    const environment = await this.createEnvironment(definition, args, state);
    const result = await execute(definition.body, this.executionOptions(environment, state));
    state.output.push(...result.output);
    state.rowsAffected += result.rowsAffected;
  }

  async callFunction(name, args, callerEnvironment, state) {
    const row = await this.db.prepare("SELECT name, source_code FROM plsql_functions WHERE name = ? COLLATE NOCASE").bind(name).first();
    if (!row) throw new PlsqlError(`Function ${name} does not exist.`, "ROUTINE_NOT_FOUND");
    const definition = parse(row.source_code);
    const environment = await this.createEnvironment(definition, args, state);
    try {
      await execute(definition.body, this.executionOptions(environment, state));
    } catch (error) {
      if (error?.code === "RETURN") return error.value;
      throw error;
    }
    throw new PlsqlError(`Function ${name} returned without RETURN.`, "MISSING_RETURN");
  }

  async createEnvironment(definition, args, state) {
    if ((state.callDepth ?? 0) >= (state.limits?.maxCallDepth ?? 20)) throw new Error("Routine call depth limit exceeded.");
    const environment = new Environment();
    definition.parameters.forEach((parameter, index) => environment.declare(parameter.name, args[index] ?? null));
    return environment;
  }

  executionOptions(environment, state) {
    return {
      environment,
      sql: state.sql,
      routines: this,
      cursors: new Map(),
      limits: state.limits,
      callDepth: (state.callDepth ?? 0) + 1,
    };
  }
}
