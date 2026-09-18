/**
 * Cloudflare Worker for Alumni SQL Console
 * Handles API endpoints and connects to Cloudflare D1 database
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Serve static files from assets
    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const asset = await env.ASSETS.fetch(request);
        return asset;
      } catch (e) {
        return new Response("Asset not found", { status: 404, headers: corsHeaders });
      }
    }
    
    // Handle CSS and JS files
    if (url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
      try {
        const asset = await env.ASSETS.fetch(request);
        return asset;
      } catch (e) {
        return new Response("Asset not found", { status: 404, headers: corsHeaders });
      }
    }
    
    // API endpoints
    if (url.pathname.startsWith("/api/")) {
      return handleAPI(request, url, env, corsHeaders);
    }
    
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};

async function handleAPI(request, url, env, corsHeaders) {
  const path = url.pathname;
  
  if (path === "/api/health") {
    try {
      const result = await env.DB.prepare("SELECT 1").first();
      return new Response(JSON.stringify({ 
        ok: true, 
        engine: "Cloudflare D1 (SQLite)", 
        database: "D1: alumni-db" 
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: error.message 
      }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  
  if (path === "/api/schema") {
    try {
      const tables = {};
      
      // Get all table names using sqlite_master
      const tableResult = await env.DB.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      ).all();
      
      for (const row of tableResult.results) {
        const tableName = row.name;
        const createSQL = row.sql;
        
        // Parse column information from CREATE TABLE statement
        const columns = [];
        const pkCols = [];
        
        // Simple parsing to extract column names and types
        const columnsMatch = createSQL.match(/\(([^)]+)\)/);
        if (columnsMatch) {
          const columnDefs = columnsMatch[1].split(',').map(col => col.trim());
          
          for (const colDef of columnDefs) {
            // Skip constraints like FOREIGN KEY, CHECK, etc.
            if (colDef.toUpperCase().startsWith('CONSTRAINT') || 
                colDef.toUpperCase().startsWith('FOREIGN KEY') ||
                colDef.toUpperCase().startsWith('PRIMARY KEY') ||
                colDef.toUpperCase().startsWith('CHECK') ||
                colDef.toUpperCase().startsWith('UNIQUE')) {
              continue;
            }
            
            // Extract column name and type
            const colParts = colDef.split(/\s+/);
            if (colParts.length >= 2) {
              const colName = colParts[0].replace(/"/g, '');
              const colType = colParts[1];
              
              columns.push({
                name: colName,
                type: colType
              });
              
              // Check if it's a primary key
              if (colDef.toUpperCase().includes('PRIMARY KEY')) {
                pkCols.push(colName);
              }
            }
          }
        }
        
        // Also check for separate PRIMARY KEY constraint
        const pkMatch = createSQL.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkColumns = pkMatch[1].split(',').map(col => col.trim().replace(/"/g, ''));
          pkCols.length = 0; // Clear previous PKs
          pkCols.push(...pkColumns);
        }
        
        tables[tableName] = {
          columns: columns,
          pk: pkCols
        };
      }
      
      return new Response(JSON.stringify({ tables }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  
  if (path === "/api/stats") {
    try {
      const stats = {};
      
      // D1 uses uppercase table names based on the schema
      const tables = ["ALUMNI", "STUDENT", "EVENT", "DONATION"];
      const keys = ["alumni", "students", "events", "donations"];
      
      for (let i = 0; i < tables.length; i++) {
        try {
          const result = await env.DB.prepare(`SELECT COUNT(*) as count FROM ${tables[i]}`).first();
          stats[keys[i]] = result.count;
        } catch (e) {
          stats[keys[i]] = 0;
        }
      }
      
      return new Response(JSON.stringify({
        database: "D1: alumni-db",
        engine: "Cloudflare D1 (SQLite)",
        stats: stats
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  
  if (path === "/api/query" && request.method === "POST") {
    try {
      const body = await request.json();
      const sql = body.sql?.trim();
      
      if (!sql) {
        return new Response(JSON.stringify({ error: "Empty statement." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const startTime = Date.now();
      
      // Determine if it's a query or execute statement
      const firstWord = sql.split(/\s+/)[0].toUpperCase();
      const isQuery = ["SELECT", "WITH", "EXPLAIN", "PRAGMA"].includes(firstWord);
      
      if (isQuery) {
        const result = await env.DB.prepare(sql).all();
        const elapsed = Date.now() - startTime;
        
        const columns = result.results.length > 0 ? Object.keys(result.results[0]) : [];
        const rows = result.results.map(row => Object.values(row));
        
        return new Response(JSON.stringify({
          ok: true,
          kind: "query",
          columns: columns,
          rows: rows,
          rowCount: rows.length,
          truncated: false,
          elapsedMs: elapsed
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else {
        const result = await env.DB.prepare(sql).run();
        const elapsed = Date.now() - startTime;
        
        return new Response(JSON.stringify({
          ok: true,
          kind: "execute",
          message: `Statement executed. ${result.meta.rows_read} row(s) affected.`,
          rowCount: result.meta.rows_read || result.meta.changes,
          elapsedMs: elapsed
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  
  return new Response(JSON.stringify({ error: "Unknown endpoint" }), { 
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}