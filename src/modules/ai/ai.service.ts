import Groq from "groq-sdk";
import { db } from "../../config/db";

export interface AiChatResult {
  success: boolean;
  message?: string;
  answer?: string;
  sql?: string;
  explanation?: string;
  data?: any[];
  errorType?: "CONFIG_ERROR" | "SECURITY_ERROR" | "DB_ERROR" | "LLM_ERROR";
}

type QueryIntent = "platform_business" | "user_activity" | "technical_logs" | "general";

// ─────────────────────────────────────────────────────────────────────────────
// Deterministically extract ground-truth facts from raw DB rows.
// These are injected into the summarizer as hard constraints so the LLM
// can NEVER contradict actual data.
// ─────────────────────────────────────────────────────────────────────────────
function extractGroundTruth(rows: any[]): string {
  if (rows.length === 0) {
    return "GROUND TRUTH: The database returned 0 rows — nothing was found.";
  }

  const lines: string[] = [`GROUND TRUTH: The database returned ${rows.length} row(s).`];
  const first = rows[0];

  // Pull out any numeric / count-like columns from the first row
  for (const [col, val] of Object.entries(first)) {
    const num = Number(val);
    if (!isNaN(num) && val !== null && val !== "") {
      lines.push(`GROUND TRUTH: column "${col}" = ${num}`);
      if (num > 0) {
        lines.push(
          `DERIVED FACT: Because "${col}" = ${num} (greater than 0), ` +
            `any "is there any / are there any / how many" question MUST be answered YES / ${num}.`
        );
      } else {
        lines.push(
          `DERIVED FACT: Because "${col}" = 0, the answer is NO / zero / none.`
        );
      }
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple heuristic: did the LLM answer contradict a non-zero count result?
// ─────────────────────────────────────────────────────────────────────────────
function answerContradictsData(answer: string, rows: any[]): boolean {
  if (rows.length === 0) return false;
  const first = rows[0];
  for (const val of Object.values(first)) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const negativePattern = /^(no[,.\s]|no\b|there are no|none|0 user|no user|not found)/i;
      if (negativePattern.test(answer.trim())) {
        console.warn("⚠️  Answer contradicts data — will regenerate summary.");
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Minify log rows for the LLM token budget
// ─────────────────────────────────────────────────────────────────────────────
function minifyRows(rows: any[]): any[] {
  return rows.slice(0, 30).map((row) => {
    // Non-log rows (e.g. users / projects table results) — pass through safely
    if (!row.level && !row.message) {
      const safe: any = {};
      for (const [k, v] of Object.entries(row)) {
        if (k !== "password_hash" && k !== "key_hash") safe[k] = v;
      }
      return safe;
    }

    // Log rows — minify
    const m: any = {
      time: row.created_at,
      level: row.level,
      service: row.service,
      msg: row.message ? String(row.message).slice(0, 150) : undefined,
    };

    if (row.metadata && typeof row.metadata === "object") {
      const keep = ["method", "url", "statusCode", "duration", "durationMs",
        "error", "exception", "table", "query", "provider", "userId", "user_id", "email"];
      const meta: any = {};
      for (const k of keep) {
        if (row.metadata[k] !== undefined) meta[k] = row.metadata[k];
      }
      const rb = row.metadata.responseBody;
      if (rb && typeof rb === "object") {
        meta.response = {};
        if (rb.userId) meta.response.userId = rb.userId;
        if (rb.user) meta.response.user = { id: rb.user.id, name: rb.user.name, email: rb.user.email };
      }
      if (Object.keys(meta).length) m.meta = meta;
    }
    return m;
  });
}

class AiService {
  private getClient(): Groq | null {
    const key = process.env.GROQ_API_KEY;
    return key ? new Groq({ apiKey: key }) : null;
  }

  // ── Model fallback chain ────────────────────────────────────────────────
  private async generate(
    groq: Groq,
    prompt: string,
    isJson = false
  ): Promise<{ text: string; model: string }> {
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3.6-27b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
    ];
    let last: any;
    for (const model of models) {
      try {
        const opts: any = { messages: [{ role: "user", content: prompt }], model };
        if (isJson) opts.response_format = { type: "json_object" };
        const res = await groq.chat.completions.create(opts);
        return { text: res.choices[0]?.message?.content || "", model };
      } catch (e: any) {
        console.warn(`⚠️ ${model} failed: ${e.message}`);
        last = e;
      }
    }
    throw last || new Error("All models failed");
  }

  // ── JSON parse with fallbacks ───────────────────────────────────────────
  private parseJson(text: string): any {
    let s = text.trim();
    if (s.startsWith("```")) {
      const nl = s.indexOf("\n");
      if (nl !== -1) s = s.slice(nl + 1);
      if (s.endsWith("```")) s = s.slice(0, -3);
      s = s.trim();
    }
    try { return JSON.parse(s); } catch { /* fall through */ }
    try {
      const fixed = s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, p) =>
        '"' + p.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"'
      );
      return JSON.parse(fixed);
    } catch { /* fall through */ }
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
    throw new Error(`Cannot parse LLM JSON: ${s.slice(0, 200)}`);
  }

  // ── Step 1: Classify intent ─────────────────────────────────────────────
  private async classifyIntent(groq: Groq, prompt: string): Promise<QueryIntent> {
    const p = `Classify this developer-observability question into ONE intent. Return only JSON: {"intent":"<value>"}

Intents:
- "platform_business" → total users on platform, registrations today, project/API-key counts, business KPIs
- "user_activity"     → what a specific (named) user did, their timeline, their requests
- "technical_logs"    → errors, latency, service health, exceptions, stack traces, HTTP codes
- "general"           → anything else

Question: "${prompt}"`;
    try {
      const { text } = await this.generate(groq, p, true);
      const parsed = this.parseJson(text);
      const intent = parsed?.intent as QueryIntent;
      if (["platform_business", "user_activity", "technical_logs", "general"].includes(intent)) {
        console.log(`🎯 Intent: ${intent}`);
        return intent;
      }
    } catch (e) {
      console.warn("⚠️ Intent classification failed:", e);
    }
    return "general";
  }

  // ── Step 2: Build SQL-translation prompt ────────────────────────────────
  private buildSqlPrompt(projectId: string, intent: QueryIntent): string {
    const schema = `
## Database Tables

### users  (platform-wide — no project_id filter needed)
id UUID, name VARCHAR, email VARCHAR, is_verified BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

### projects  (platform-wide)
id UUID, owner_id UUID→users.id, name VARCHAR, slug VARCHAR, is_active BOOLEAN, created_at TIMESTAMPTZ

### api_keys  (platform-wide)
id UUID, project_id UUID→projects.id, name VARCHAR, prefix VARCHAR, is_active BOOLEAN,
last_used_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, environment VARCHAR, created_at TIMESTAMPTZ

### logs  ← ALWAYS filter: logs.project_id = '${projectId}'
id UUID, project_id UUID, api_key_id UUID, level VARCHAR('debug'|'info'|'warn'|'error'),
message TEXT, service VARCHAR, environment VARCHAR, metadata JSONB, trace_id VARCHAR,
request_id VARCHAR, hostname VARCHAR, created_at TIMESTAMPTZ

#### metadata JSONB structure (logs):
- HTTP: ->>'method', ->>'url', ->>'statusCode', ->>'latency_ms'
- User identity in logs: ->>'userId', ->>'user_id', ->>'email'
  OR nested: ->'responseBody'->>'userId'  |  ->'responseBody'->'user'->>'id' / 'name' / 'email'
- DB ops: ->>'table', ->>'query'
- Errors: ->>'error', ->>'exception'

#### CRITICAL JSONB rules:
- Use '->' for intermediate levels, '->>' ONLY for the final leaf (returns text).
- NEVER: metadata->>'responseBody'->>'userId'  ✅ DO: metadata->'responseBody'->>'userId'
- NEVER use ILIKE on raw JSONB — cast first: metadata::text ILIKE '%term%'
`;

    const intentGuide: Record<QueryIntent, string> = {
      platform_business: `
## This is a PLATFORM / BUSINESS question.
- "new users today / this week" → SELECT … FROM users WHERE created_at >= NOW() - INTERVAL '…'
- "users in this project" → users who sent logs to this project:
    SELECT COUNT(DISTINCT COALESCE(metadata->>'userId', metadata->>'user_id',
      metadata->'responseBody'->>'userId', metadata->'responseBody'->'user'->>'id')) AS user_count
    FROM logs WHERE project_id = '${projectId}' AND created_at >= NOW() - INTERVAL '1 day'
    AND COALESCE(metadata->>'userId', metadata->>'user_id',
      metadata->'responseBody'->>'userId', metadata->'responseBody'->'user'->>'id') IS NOT NULL
- "how many projects / API keys" → query projects / api_keys tables directly.
- When the question says "in this project" but asks about users → query LOGS for that project_id, not the raw users table.
`,
      user_activity: `
## This is a USER ACTIVITY question — query logs scoped to project_id = '${projectId}'.
- Find user by: metadata->>'userId' ILIKE '%id%' OR metadata::text ILIKE '%name_or_email%'
- Order chronologically (ORDER BY created_at ASC) for a step-by-step timeline.
`,
      technical_logs: `
## This is a TECHNICAL / OBSERVABILITY question — query logs scoped to project_id = '${projectId}'.
- Errors: level = 'error'
- Slow: (metadata->>'latency_ms')::int > threshold
- Exceptions: metadata->>'exception' IS NOT NULL
`,
      general: `
## General question — use whichever tables fit. Logs MUST be scoped to project_id = '${projectId}'.
`,
    };

    return `You are a PostgreSQL expert for the LogSense observability platform.
Translate the natural language question into a safe, read-only SELECT query.

${schema}
${intentGuide[intent]}

## Absolute rules
1. Only SELECT — no INSERT / UPDATE / DELETE / DROP / ALTER / TRUNCATE / CREATE / GRANT / REVOKE.
2. Querying logs → MUST include WHERE logs.project_id = '${projectId}'.
3. Querying users / projects / api_keys → no project_id filter needed (platform-wide).
4. LIMIT 50 rows max.
5. Dates relative to NOW(). "today" = created_at >= NOW() - INTERVAL '1 day'.
6. Prefer ILIKE fuzzy matching over strict equals for names/emails/URLs.

## Output — return ONLY this JSON:
{
  "sql": "SELECT ...",
  "explanation": "plain English description of what the query does",
  "fallback_keywords": ["terms to use in broad text search if 0 rows returned"]
}`;
  }

  // ── Step 3: Build summarizer prompt (with ground truth injected) ─────────
  private buildSummaryPrompt(
    prompt: string,
    sql: string,
    rows: any[],
    intent: QueryIntent,
    groundTruth: string
  ): string {
    const intentHint: Record<QueryIntent, string> = {
      platform_business: "Give crisp numbers. Bold the key metric. Use bullet points for lists.",
      user_activity: "Show a numbered step-by-step chronological timeline.",
      technical_logs: "Be precise: include counts, service names, error messages, latencies.",
      general: "Answer directly and concisely.",
    };

    return `You are LogSense Observability AI. Answer the user's question using ONLY the data below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED GROUND TRUTH (from the database — you MUST NOT contradict these facts):
${groundTruth}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User question: "${prompt}"

SQL executed:
\`\`\`sql
${sql}
\`\`\`

Raw results (up to 30 rows):
${JSON.stringify(minifyRows(rows), null, 2)}

Intent style: ${intentHint[intent]}

Formatting rules — follow strictly:
1. Your answer MUST be consistent with the GROUND TRUTH above. If count > 0, you MUST say Yes/there are N. If count = 0, say No/none.
2. Lead with the direct answer. If yes/no question — start with "Yes" or "No".
3. Bold the key number: e.g. "**2 new users** were found today."
4. For user activity: numbered chronological steps.
5. For lists: clean bulleted list, no intro fluff.
6. Never start with "Sure," or "Of course," or similar preamble.
7. Never echo password_hash or key_hash values.`;
  }

  // ── Main entry point ────────────────────────────────────────────────────
  async queryLogs(projectId: string, prompt: string): Promise<AiChatResult> {
    const groq = this.getClient();
    if (!groq) {
      return {
        success: false,
        errorType: "CONFIG_ERROR",
        message: "GROQ_API_KEY is not configured on the server.",
      };
    }

    // 1. Classify intent
    const intent = await this.classifyIntent(groq, prompt);

    // 2. Translate to SQL
    const sqlPrompt = this.buildSqlPrompt(projectId, intent);
    let sql = "";
    let explanation = "";
    let parsed: any = {};

    try {
      const { text, model } = await this.generate(
        groq,
        `${sqlPrompt}\n\nUser question: "${prompt}"`,
        true
      );
      console.log(`🤖 SQL generated by ${model}`);
      parsed = this.parseJson(text);
      sql = parsed.sql?.trim() || "";
      explanation = parsed.explanation || "";
      if (!sql) {
        return { success: false, errorType: "LLM_ERROR", message: "Failed to generate SQL from your prompt." };
      }
    } catch (e: any) {
      return { success: false, errorType: "LLM_ERROR", message: `SQL generation failed: ${e.message}` };
    }

    // 3. Security validation
    const sqlLower = sql.toLowerCase();
    const isSelect = /^\s*select\b/i.test(sql);
    const hasWriteOp = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i.test(sqlLower);
    const touchesLogs = sqlLower.includes("from logs") || sqlLower.includes("join logs");
    const hasScopeFilter = !touchesLogs ||
      (sqlLower.includes("project_id") && sqlLower.includes(projectId.toLowerCase()));

    if (!isSelect || hasWriteOp || !hasScopeFilter) {
      return {
        success: false, errorType: "SECURITY_ERROR",
        message: "Generated query failed security checks (must be read-only and project-scoped for log queries).",
        sql, explanation,
      };
    }

    // 4. Execute SQL
    let rows: any[] = [];
    try {
      const result = await db.query(sql);
      rows = result.rows;
    } catch (e: any) {
      console.error("❌ SQL execution error:", e);
      return { success: false, errorType: "DB_ERROR", message: `Query failed: ${e.message}`, sql, explanation };
    }

    // 5. Fuzzy fallback for 0 log rows
    if (rows.length === 0 && touchesLogs && Array.isArray(parsed.fallback_keywords)) {
      const kws = parsed.fallback_keywords.filter((k: any) => typeof k === "string" && k.trim().length > 1);
      if (kws.length > 0) {
        console.log("⚠️ 0 rows — trying fuzzy fallback:", kws);
        const cond = kws.map((k: string) => `(message ILIKE '%${k.replace(/'/g, "''")}%' OR metadata::text ILIKE '%${k.replace(/'/g, "''")}%')`).join(" OR ");
        const fbSql = `SELECT id, level, service, message, metadata, created_at FROM logs WHERE project_id = '${projectId}' AND (${cond}) ORDER BY created_at DESC LIMIT 50;`;
        try {
          const fbRes = await db.query(fbSql);
          if (fbRes.rows.length > 0) {
            rows = fbRes.rows;
            sql = fbSql;
            explanation = `Fuzzy fallback for: ${kws.join(", ")}`;
          }
        } catch (e) { console.error("❌ Fuzzy fallback failed:", e); }
      }
    }

    // 6. Extract ground truth DETERMINISTICALLY (code, not LLM)
    const groundTruth = extractGroundTruth(rows);
    console.log(`📊 Ground truth: ${groundTruth}`);

    // 7. Summarize with ground truth as hard constraint
    const summaryPrompt = this.buildSummaryPrompt(prompt, sql, rows, intent, groundTruth);
    try {
      let { text: answer, model } = await this.generate(groq, summaryPrompt, false);
      console.log(`🤖 Summary by ${model}`);

      // 8. Sanity check — if LLM contradicts data, regenerate once with stricter wording
      if (answerContradictsData(answer, rows)) {
        const retry = summaryPrompt +
          `\n\n⚠️ CORRECTION REQUIRED: Your previous answer contradicted the GROUND TRUTH. ` +
          `The database clearly shows non-zero results. Rewrite the answer correctly, starting with "Yes" or the actual count.`;
        const retried = await this.generate(groq, retry, false);
        answer = retried.text;
        console.log(`🔄 Answer regenerated after contradiction detected`);
      }

      return { success: true, answer, sql, explanation, data: rows };
    } catch (e: any) {
      return {
        success: true,
        answer: `Query succeeded but summarization failed: ${e.message}`,
        sql, explanation, data: rows,
      };
    }
  }
}

export const aiService = new AiService();
