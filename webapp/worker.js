import { detectStatementType } from "./plsql/detect.js";
import { parse } from "./plsql/parser.js";
import { execute } from "./plsql/interpreter.js";
import { D1SqlExecutor } from "./plsql/sql-executor.js";
import { RoutineService } from "./plsql/routines.js";
import { TriggerService } from "./plsql/triggers.js";

const DEFAULT_MAX_ROWS = 1000;
const MAX_SQL_BYTES = 128 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
      try { return await env.ASSETS.fetch(request); } catch { return new Response("Asset not found", { status: 404, headers: corsHeaders }); }
    }
    if (url.pathname.startsWith("/api/")) return handleAPI(request, url, env, corsHeaders);
    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};

export async function handleAPI(request, url, env, corsHeaders) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    try {
      await env.DB.prepare("SELECT 1").first();
      return json({ ok: true, engine: "Cloudflare D1 (SQLite)", database: "D1: alumni-db" }, corsHeaders);
    } catch (error) {
      return json({ ok: false, error: safeError(error) }, corsHeaders, 503);
    }
  }

  if (url.pathname === "/api/schema" && request.method === "GET") {
    try {
      const result = await env.DB.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
      const tables = {};
      for (const table of result.results ?? []) tables[table.name] = parseSchema(table.sql);
      return json({ tables }, corsHeaders);
    } catch (error) {
      return json({ ok: false, error: safeError(error) }, corsHeaders, 503);
    }
  }

  if (url.pathname === "/api/stats" && request.method === "GET") {
    const stats = {};
    for (const [key, table] of [["alumni", "ALUMNI"], ["students", "STUDENT"], ["events", "EVENT"], ["donations", "DONATION"]]) {
      try { stats[key] = (await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first())?.count ?? 0; } catch { stats[key] = 0; }
    }
    return json({ database: "D1: alumni-db", engine: "Cloudflare D1 (SQLite)", stats }, corsHeaders);
  }

  if (url.pathname === "/api/query" && request.method === "POST") return executeRequest(request, env, corsHeaders);
  return json({ ok: false, error: "Unknown endpoint" }, corsHeaders, 404);
}

async function executeRequest(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const sql = typeof body.sql === "string" ? body.sql.trim() : "";
    if (!sql) return json({ ok: false, error: "Empty statement." }, corsHeaders, 400);
    if (new TextEncoder().encode(sql).byteLength > MAX_SQL_BYTES) return json({ ok: false, error: "Statement is too large." }, corsHeaders, 413);

    const started = Date.now();
    const triggers = new TriggerService(env.DB);
    const sqlExecutor = new D1SqlExecutor(env.DB, { triggers });
    triggers.sql = sqlExecutor;
    const routines = new RoutineService(env.DB);
    const type = detectStatementType(sql);

    if (type === "SQL") {
      const isQuery = /^\s*(SELECT|WITH|EXPLAIN|PRAGMA)\b/i.test(sql);
      if (isQuery) {
        const result = await sqlExecutor.query(sql);
        const maxRows = Number(env.MAX_ROWS || DEFAULT_MAX_ROWS);
        const rows = result.rows.slice(0, maxRows);
        return json({ ok: true, kind: "query", columns: result.columns, rows, rowCount: rows.length, truncated: result.rows.length > maxRows, elapsedMs: Date.now() - started }, corsHeaders);
      }
      const result = await sqlExecutor.execute(sql);
      return json({ ok: true, kind: "execute", message: `Statement executed. ${result.rowsAffected} row(s) affected.`, rowCount: result.rowsAffected, elapsedMs: Date.now() - started }, corsHeaders);
    }

    const ast = parse(sql);
    if (type === "PROCEDURE" || type === "FUNCTION") {
      await routines.save(ast, sql);
      return json({ ok: true, kind: "plsql", message: `${type} ${ast.name} created successfully.`, output: [], rowsAffected: 0, elapsedMs: Date.now() - started }, corsHeaders);
    }
    if (type === "TRIGGER") {
      await triggers.save(ast, sql);
      return json({ ok: true, kind: "plsql", message: `TRIGGER ${ast.name} created successfully.`, output: [], rowsAffected: 0, elapsedMs: Date.now() - started }, corsHeaders);
    }

    const result = await execute(ast, { sql: sqlExecutor, routines, limits: { maxIterations: Number(env.MAX_ITERATIONS || 10_000), maxOutputLines: Number(env.MAX_OUTPUT_LINES || 1_000), maxCallDepth: Number(env.MAX_CALL_DEPTH || 20) } });
    return json({ ok: true, kind: "plsql", message: "PL/SQL block executed successfully.", output: result.output, rowsAffected: result.rowsAffected, elapsedMs: Date.now() - started }, corsHeaders);
  } catch (error) {
    return json({ ok: false, error: safeError(error), code: error.code || "PLSQL_ERROR" }, corsHeaders, 400);
  }
}

function parseSchema(createSQL) {
  const columns = [];
  const primaryKeys = [];
  const body = createSQL?.slice(createSQL.indexOf("(") + 1, createSQL.lastIndexOf(")")) || "";
  for (const definition of body.split(",")) {
    const parts = definition.trim().split(/\s+/);
    if (parts.length < 2 || /^(CONSTRAINT|FOREIGN|PRIMARY|CHECK|UNIQUE)$/i.test(parts[0])) continue;
    const name = parts[0].replaceAll('"', "");
    columns.push({ name, type: parts[1] });
    if (/PRIMARY KEY/i.test(definition)) primaryKeys.push(name);
  }
  const keyMatch = createSQL?.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
  if (keyMatch) primaryKeys.splice(0, primaryKeys.length, ...keyMatch[1].split(",").map((value) => value.trim()));
  return { columns, pk: primaryKeys };
}

function json(value, corsHeaders, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

function safeError(error) {
  return error?.code ? `${error.code}: ${error.message}` : (error?.message || "Request failed.");
}
