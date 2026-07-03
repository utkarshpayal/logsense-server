import { db } from "../../../config/db";
import { groqClient } from "../groq.client";
import { sqlValidator } from "./sql-validator";
import { ToolResult } from "../tools/base.tool";

const SCHEMA_CONTEXT = `
## Database Schema (read-only)

### users  (platform-wide)
id UUID, name VARCHAR, email VARCHAR, is_verified BOOLEAN, created_at TIMESTAMPTZ

### projects  (platform-wide)
id UUID, owner_id UUID→users.id, name VARCHAR, slug VARCHAR, is_active BOOLEAN, created_at TIMESTAMPTZ

### api_keys  (platform-wide)
id UUID, project_id UUID→projects.id, name VARCHAR, prefix VARCHAR,
is_active BOOLEAN, last_used_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
environment VARCHAR, created_at TIMESTAMPTZ

### logs  ← MUST filter logs.project_id = '<projectId>'
id UUID, project_id UUID, api_key_id UUID,
level VARCHAR ('debug'|'info'|'warn'|'error'),
message TEXT, service VARCHAR, environment VARCHAR,
metadata JSONB, trace_id VARCHAR, request_id VARCHAR,
hostname VARCHAR, created_at TIMESTAMPTZ

## JSONB metadata keys (logs table):
- HTTP: metadata->>'method', ->>'url' or ->>'route', ->>'statusCode', ->>'latency_ms'
- User: metadata->>'userId', ->>'user_id', ->>'email'
  OR nested: metadata->'responseBody'->>'userId'
          OR metadata->'responseBody'->'user'->>'id'/'name'/'email'
- DB:    metadata->>'table', ->>'query', ->>'queryDurationMs'
- Redis: metadata->>'redisCommand', ->>'redisKey', ->>'redisDurationMs'
- Error: metadata->>'error', ->>'exception'

## JSONB operator rules (critical):
- '->' returns JSONB (intermediate), '->>' returns text (leaf only)
- NEVER chain '->>' twice. ❌ metadata->>'a'->>'b'  ✅ metadata->'a'->>'b'
- NEVER ILIKE on raw JSONB. Cast first: metadata::text ILIKE '%term%'
- Use COALESCE for nullable fields.
`;

const GENERATION_PROMPT = (projectId: string, prompt: string) =>
  `You are a PostgreSQL expert for the LogSense observability platform.
Generate a safe, read-only SELECT query for this question.

${SCHEMA_CONTEXT}

## Rules
1. Only SELECT — no INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/GRANT/REVOKE.
2. If querying logs → MUST include WHERE logs.project_id = '${projectId}'.
3. Users/projects/api_keys queries do NOT need project_id (platform-wide tables).
4. LIMIT 50 rows maximum.
5. Dates relative to NOW(). "today" = created_at >= NOW() - INTERVAL '1 day'.
6. Prefer ILIKE fuzzy matching for names/emails/URLs.

Return ONLY this JSON:
{
  "sql": "SELECT ...",
  "explanation": "brief description",
  "fallback_keywords": ["keyword1", "keyword2"]
}

User question: "${prompt}"`;

export class FallbackSqlGenerator {
  async generate(projectId: string, prompt: string): Promise<ToolResult> {
    console.log("🔧 [FallbackSqlGenerator] Generating dynamic SQL");

    // 1. Ask LLM for SQL
    let sql = "";
    let explanation = "";
    let fallbackKeywords: string[] = [];

    try {
      const { text } = await groqClient.generate(
        GENERATION_PROMPT(projectId, prompt),
        true
      );
      const parsed = groqClient.parseJson(text);
      sql = (parsed?.sql ?? "").trim();
      explanation = parsed?.explanation ?? "Custom SQL query";
      fallbackKeywords = Array.isArray(parsed?.fallback_keywords)
        ? parsed.fallback_keywords.filter((k: any) => typeof k === "string" && k.length > 1)
        : [];
    } catch (e: any) {
      throw new Error(`SQL generation failed: ${e.message}`);
    }

    if (!sql) {
      throw new Error("LLM returned an empty SQL query.");
    }

    // 2. Validate
    const validation = sqlValidator.validate(sql, projectId);
    if (!validation.valid) {
      throw new Error(`SQL validation failed: ${validation.reason}`);
    }

    // 3. Execute
    let rows: any[] = [];
    try {
      const res = await db.query(sql);
      rows = res.rows;
    } catch (e: any) {
      throw new Error(`SQL execution failed: ${e.message}`);
    }

    // 4. Fuzzy fallback if 0 rows and we have keywords
    if (rows.length === 0 && fallbackKeywords.length > 0) {
      const lower = sql.toLowerCase();
      const touchesLogs = lower.includes("from logs") || lower.includes("join logs");
      if (touchesLogs) {
        console.log("⚠️  [FallbackSqlGenerator] 0 rows — trying keyword search");
        const cond = fallbackKeywords
          .map((k) => `(message ILIKE '%${k.replace(/'/g, "''")}%' OR metadata::text ILIKE '%${k.replace(/'/g, "''")}%')`)
          .join(" OR ");
        const fbSql = `SELECT id, level, service, message, metadata, created_at FROM logs WHERE project_id = '${projectId}' AND (${cond}) ORDER BY created_at DESC LIMIT 50`;
        try {
          const fbRes = await db.query(fbSql);
          if (fbRes.rows.length > 0) {
            rows = fbRes.rows;
            sql = fbSql;
            explanation = `Fuzzy keyword fallback: ${fallbackKeywords.join(", ")}`;
          }
        } catch { /* ignore fallback failures */ }
      }
    }

    return { sql, rows, explanation };
  }
}

export const fallbackSqlGenerator = new FallbackSqlGenerator();
