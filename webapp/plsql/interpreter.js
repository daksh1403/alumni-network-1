import { Environment } from "./environment.js";
import { evaluate } from "./expressions.js";

const DEFAULT_LIMITS = { maxIterations: 10_000, maxOutputLines: 1_000, maxCallDepth: 20 };

class ExitSignal extends Error {}

export async function execute(ast, options = {}) {
  const state = {
    sql: options.sql,
    output: [],
    iterations: 0,
    callDepth: options.callDepth ?? 0,
    limits: { ...DEFAULT_LIMITS, ...(options.limits ?? {}) },
    cursors: options.cursors ?? new Map(),
    routines: options.routines,
    rowsAffected: 0,
    evaluate: (node, environment) => evaluate(node, environment, context(state)),
  };
  const environment = options.environment ?? new Environment();
  await executeBlock(ast, environment, state);
  return { output: state.output, rowsAffected: state.rowsAffected };
}

async function executeBlock(block, environment, state) {
  for (const declaration of block.declarations) {
    if (declaration.type === "CursorDeclaration") {
      state.cursors.set(declaration.name, { sql: declaration.sql, state: "closed", rows: [], index: -1, attribute: () => false });
      continue;
    }
    const value = declaration.initializer ? await evaluate(declaration.initializer, environment, context(state)) : null;
    environment.declare(declaration.name, value);
  }
  try {
    await executeStatements(block.body, environment, state);
  } catch (error) {
    if (!block.exception) throw error;
    const handler = block.exception.handlers.find((candidate) => candidate.names.includes(error.code) || candidate.names.includes("OTHERS"));
    if (!handler) throw error;
    await executeStatements(handler.body, environment, state);
  }
}

async function executeStatements(statements, environment, state) {
  for (const statement of statements) await executeStatement(statement, environment, state);
}

async function executeStatement(statement, environment, state) {
  switch (statement.type) {
    case "NullStatement": return;
    case "Assignment": environment.set(statement.name, await evaluate(statement.expression, environment, context(state))); return;
    case "OutputStatement":
      if (state.output.length >= state.limits.maxOutputLines) throw new Error("Output line limit exceeded.");
      state.output.push(String(await evaluate(statement.expression, environment, context(state)) ?? ""));
      return;
    case "IfStatement":
      for (const branch of statement.branches) {
        if (await evaluate(branch.condition, environment, context(state))) { await executeStatements(branch.body, environment, state); return; }
      }
      await executeStatements(statement.alternate, environment, state); return;
    case "ForLoop": return executeFor(statement, environment, state);
    case "WhileLoop":
      while (await evaluate(statement.condition, environment, context(state))) {
        tick(state); try { await executeStatements(statement.body, environment, state); } catch (error) { if (error instanceof ExitSignal) break; throw error; }
      }
      return;
    case "Loop":
      while (true) {
        tick(state); try { await executeStatements(statement.body, environment, state); } catch (error) { if (error instanceof ExitSignal) break; throw error; }
      }
      return;
    case "ExitWhen": if (await evaluate(statement.condition, environment, context(state))) throw new ExitSignal(); return;
    case "SqlStatement": state.rowsAffected += (await state.sql.execute(statement.sql)).rowsAffected ?? 0; return;
    case "SelectIntoStatement": {
      const result = await state.sql.selectInto(statement.sql, statement.targets);
      statement.targets.forEach((name, index) => environment.set(name, result.values[index]));
      return;
    }
    case "OpenCursor": return openCursor(statement.name, state);
    case "FetchCursor": return fetchCursor(statement, environment, state);
    case "CloseCursor": state.cursors.get(statement.name).state = "closed"; return;
    case "CursorForLoop": return executeCursorFor(statement, environment, state);
    case "ProcedureCall":
      if (!state.routines) throw new Error(`Procedure ${statement.name} is not available.`);
      await state.routines.callProcedure(statement.name, statement.args, environment, state); return;
    case "ReturnStatement": throw { code: "RETURN", value: await evaluate(statement.expression, environment, context(state)) };
    default: throw new Error(`Unsupported statement ${statement.type}.`);
  }
}

async function executeFor(statement, environment, state) {
  let start = Number(await evaluate(statement.start, environment, context(state)));
  let end = Number(await evaluate(statement.end, environment, context(state)));
  const step = statement.reverse ? -1 : 1;
  if (statement.reverse) [start, end] = [end, start];
  environment.declare(statement.name, start);
  for (let current = start; step > 0 ? current <= end : current >= end; current += step) {
    tick(state); environment.set(statement.name, current); await executeStatements(statement.body, environment, state);
  }
}

function tick(state) {
  state.iterations += 1;
  if (state.iterations > state.limits.maxIterations) throw new Error("Loop iteration limit exceeded.");
}

function context(state) {
  return {
    cursors: state.cursors,
    callFunction: state.routines
      ? (name, args, environment) => state.routines.callFunction(name, args, environment, state)
      : undefined,
  };
}

async function openCursor(name, state) {
  const cursor = state.cursors.get(name);
  cursor.rows = (await state.sql.query(cursor.sql)).rows;
  cursor.index = -1; cursor.state = "open";
  cursor.attribute = (attribute) => {
    if (attribute === "FOUND") return cursor.index >= 0 && cursor.index < cursor.rows.length;
    if (attribute === "NOTFOUND") return cursor.index >= cursor.rows.length;
    if (attribute === "ROWCOUNT") return Math.max(cursor.index + 1, 0);
    return null;
  };
}

async function fetchCursor(statement, environment, state) {
  const cursor = state.cursors.get(statement.cursor);
  cursor.index += 1;
  const row = cursor.rows[cursor.index];
  if (!row) return;
  statement.targets.forEach((name, index) => environment.set(name, row[index] ?? row[name]));
}

async function executeCursorFor(statement, environment, state) {
  const result = await state.sql.query(statement.sql);
  for (const row of result.rows) {
    tick(state);
    const record = {};
    result.columns.forEach((column, index) => { record[column] = row[index]; record[column.toUpperCase()] = row[index]; });
    environment.declare(statement.name, record);
    await executeStatements(statement.body, environment, state);
  }
}
