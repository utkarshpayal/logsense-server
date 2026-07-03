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

// ---------------------------------------------------------------------------
// Intent types – drive which SQL schema context we inject
// ---------------------------------------------------------------------------
type QueryIntent =
  | "platform_business"   // users on platform, registrations, project counts …
  | "user_activity"       // what did a specific user do?
  | "technical_logs"      // errors, latency, services, stack-traces …
  | "general";            // everything else, try full schema

class AiService {
  private getClient(): Groq | null {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new Groq({ apiKey });
  }

  // -------------------------------------------------------------------------
  // LLM call with model fallback chain
  // -------------------------------------------------------------------------
  private async generateWithFallback(
    groq: Groq,
    contents: string[],
    isJson: boolean = false
  ): Promise<{ text: string; modelUsed: string }> {
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3.6-27b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "openai/gpt-oss-120b",
    ];

    let lastError: any = null;
    const messageContent = contents.join("\n");

    for (const modelName of models) {
      try {
        const options: any = {
          messages: [{ role: "user", content: messageContent }],
          model: modelName,
        };

        if (isJson) {
          options.response_format = { type: "json_object" };
        }

        const chatCompletion = await groq.chat.completions.create(options);
        const text = chatCompletion.choices[0]?.message?.content || "";
        return { text, modelUsed: modelName };
      } catch (err: any) {
        console.warn(
          `⚠️ Model ${modelName} failed. Error: ${err.message || err}. Trying next model...`
        );
        lastError = err;
      }
    }

    throw lastError || new Error("All fallback models failed.");
  }

  // -------------------------------------------------------------------------
  // JSON response parsing (handles markdown fences, unescaped newlines, etc.)
  // -------------------------------------------------------------------------
  private parseJsonResponse(text: string): any {
    let clean = text.trim();
    if (clean.startsWith("```")) {
      const firstNewline = clean.indexOf("\n");
      if (firstNewline !== -1) clean = clean.slice(firstNewline + 1);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      clean = clean.trim();
    }

    try {
      return JSON.parse(clean);
    } catch {
      try {
        const fixedClean = clean.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
          return '"' + p1.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
        });
        return JSON.parse(fixedClean);
      } catch {
        // fall through to brace-match regex
      }

      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // fall through
        }
      }
      throw new Error(`Could not parse LLM JSON response: ${clean.slice(0, 200)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Minify log rows to stay within LLM token budget
  // -------------------------------------------------------------------------
  private minifyLogRows(rows: any[]): any[] {
    return rows.slice(0, 30).map((row) => {
      const minified: any = {
        time: row.created_at,
        level: row.level,
        service: row.service,
      };

      if (row.message) {
        minified.msg =
          row.message.length > 150 ? row.message.slice(0, 150) + "..." : row.message;
      }

      if (row.metadata && typeof row.metadata === "object") {
        const essentialMeta: any = {};
        const keysToKeep = [
          "method",
          "url",
          "statusCode",
          "duration",
          "durationMs",
          "error",
          "exception",
          "table",
          "query",
          "provider",
          "userId",
          "user_id",
          "email",
        ];

        for (const k of keysToKeep) {
          if (row.metadata[k] !== undefined) essentialMeta[k] = row.metadata[k];
        }

        if (
          row.metadata.responseBody &&
          typeof row.metadata.responseBody === "object"
        ) {
          const rb = row.metadata.responseBody;
          essentialMeta.response = {};
          if (rb.userId) essentialMeta.response.userId = rb.userId;
          if (rb.user && typeof rb.user === "object") {
            essentialMeta.response.user = {
              id: rb.user.id,
              name: rb.user.name,
              email: rb.user.email,
            };
          }
        }

        if (Object.keys(essentialMeta).length > 0) minified.meta = essentialMeta;
      }

      // Pass through plain columns when row is not a log (e.g. users query)
      if (row.id && !row.level) {
        const plain: any = {};
        for (const [k, v] of Object.entries(row)) {
          if (k !== "password_hash" && k !== "key_hash" && v !== null) {
            plain[k] = v;
          }
        }
        return plain;
      }

      return minified;
    });
  }

  // -------------------------------------------------------------------------
  // Classify the user's intent so we can pick the right schema context
  // -------------------------------------------------------------------------
  private async classifyIntent(
    groq: Groq,
    prompt: string
  ): Promise<QueryIntent> {
    const classifyPrompt = `You are an intent classifier for a developer observability platform called LogSense.
Classify the user question below into ONE of these intents:

1. "platform_business" — asking about the platform itself: total users registered, number of projects, new sign-ups, API-key counts, which users joined, business KPIs.
2. "user_activity"     — asking what a specific (named or identified) user did: their actions, requests, errors, timeline.
3. "technical_logs"   — asking about application logs: errors, latency, service health, stack traces, HTTP status codes, slow queries, exceptions.
4. "general"          — anything else or ambiguous.

Return ONLY a JSON object like: {"intent": "platform_business"}

User question: "${prompt}"`;

    try {
      const { text } = await this.generateWithFallback(groq, [classifyPrompt], true);
      const parsed = this.parseJsonResponse(text);
      const intent = parsed?.intent as QueryIntent;
      if (
        ["platform_business", "user_activity", "technical_logs", "general"].includes(
          intent
        )
      ) {
        console.log(`🎯 AI intent classified as: ${intent}`);
        return intent;
      }
    } catch (err) {
      console.warn("⚠️ Intent classification failed, defaulting to general:", err);
    }
    return "general";
  }

  // -------------------------------------------------------------------------
  // Build the SQL-translation system prompt based on intent
  // -------------------------------------------------------------------------
  private buildSqlTranslationPrompt(projectId: string, intent: QueryIntent): string {
    // ── Shared schema description ──────────────────────────────────────────
    const fullSchema = `
## Full Database Schema

### Table: users
| Column        | Type         | Notes                            |
|---------------|--------------|----------------------------------|
| id            | UUID         | Primary key                      |
| name          | VARCHAR(100) | Full name                        |
| email         | VARCHAR(255) | Unique                           |
| is_verified   | BOOLEAN      |                                  |
| created_at    | TIMESTAMPTZ  | When the user registered         |
| updated_at    | TIMESTAMPTZ  |                                  |

### Table: projects
| Column      | Type         | Notes                                          |
|-------------|--------------|------------------------------------------------|
| id          | UUID         | Primary key                                    |
| owner_id    | UUID         | FK → users.id                                  |
| name        | VARCHAR(100) |                                                |
| slug        | VARCHAR(100) | Unique URL-safe identifier                     |
| description | TEXT         |                                                |
| is_active   | BOOLEAN      |                                                |
| created_at  | TIMESTAMPTZ  |                                                |
| updated_at  | TIMESTAMPTZ  |                                                |

### Table: api_keys
| Column       | Type         | Notes                              |
|--------------|--------------|------------------------------------|
| id           | UUID         | Primary key                        |
| project_id   | UUID         | FK → projects.id                   |
| name         | VARCHAR(100) |                                    |
| prefix       | VARCHAR(20)  | First chars of key (safe to show)  |
| is_active    | BOOLEAN      |                                    |
| last_used_at | TIMESTAMPTZ  |                                    |
| expires_at   | TIMESTAMPTZ  |                                    |
| environment  | VARCHAR(20)  | 'production' | 'development'        |
| created_at   | TIMESTAMPTZ  |                                    |

### Table: logs
| Column      | Type        | Notes                                                       |
|-------------|-------------|-------------------------------------------------------------|
| id          | UUID        |                                                             |
| project_id  | UUID        | MUST ALWAYS be filtered: logs.project_id = '${projectId}'  |
| api_key_id  | UUID        |                                                             |
| level       | VARCHAR     | 'debug' | 'info' | 'warn' | 'error'                        |
| message     | TEXT        |                                                             |
| service     | VARCHAR     | e.g. 'auth-service', 'payment-service'                      |
| environment | VARCHAR     | e.g. 'production', 'development'                            |
| metadata    | JSONB       | Structured request/response data (see notes below)          |
| trace_id    | VARCHAR     |                                                             |
| request_id  | VARCHAR     |                                                             |
| hostname    | VARCHAR     |                                                             |
| created_at  | TIMESTAMPTZ |                                                             |

#### JSONB metadata notes for logs:
- HTTP logs: metadata->>'method', metadata->>'url', metadata->>'statusCode', metadata->>'latency_ms'
- User identity: metadata->>'userId', metadata->>'user_id', metadata->>'email'
- Response payload: metadata->'responseBody'->>'userId' or metadata->'responseBody'->'user'->>'id' / 'name' / 'email'
- DB queries: metadata->>'table', metadata->>'query'
- Errors: metadata->>'error', metadata->>'exception'

#### CRITICAL JSONB operator rules:
- Use '->' for intermediate JSONB traversal, '->>' only for the final text leaf.
- NEVER chain '->>' twice: ❌ metadata->>'responseBody'->>'userId'  ✅ metadata->'responseBody'->>'userId'
- Never use ILIKE/LIKE directly on JSONB; cast to text first: metadata::text ILIKE '%term%'
`;

    // ── Intent-specific guidance ───────────────────────────────────────────
    const intentGuidance: Record<QueryIntent, string> = {
      platform_business: `
## Intent: Platform Business Metrics
You may query users, projects, api_keys, AND logs tables.
- "how many users" → COUNT(*) FROM users (or JOIN with projects if scoped to a project owner)
- "users today / this week" → users.created_at >= NOW() - INTERVAL '1 day'
- "which users are on the platform" → SELECT id, name, email, created_at FROM users ORDER BY created_at DESC
- "how many projects" → COUNT(*) FROM projects (optionally WHERE owner_id = any user)
- Do NOT restrict to project_id unless the question is specifically about logs data.
`,
      user_activity: `
## Intent: User Activity
You will primarily query the logs table, filtered by project_id = '${projectId}'.
- Identify the user from metadata->>'userId', metadata->>'email', metadata->'responseBody'->'user'->>'id', or name.
- Use ILIKE fuzzy search when matching by name/email.
- Order chronologically (ORDER BY created_at ASC) to show a timeline.
- If the user is identified by name, try: metadata::text ILIKE '%name%' OR metadata->'responseBody'->'user'->>'name' ILIKE '%name%'
`,
      technical_logs: `
## Intent: Technical Logs / Observability
Query the logs table, always filtered by project_id = '${projectId}'.
- Errors: level = 'error'
- Slow requests: (metadata->>'latency_ms')::int > threshold
- Service health: GROUP BY service, COUNT errors
- Exceptions: metadata->>'exception' IS NOT NULL
`,
      general: `
## Intent: General / Mixed
Use whichever tables are appropriate. If asking about platform-level counts (users, projects), query those tables directly. If asking about log events, filter logs by project_id = '${projectId}'.
`,
    };

    return `You are a PostgreSQL expert for the LogSense observability platform.
Translate the natural language question into a safe, read-only SELECT query.

${fullSchema}

${intentGuidance[intent]}

## URL / Domain Mappings for logs
- "agencies" / "publishers" / "author list" → metadata->>'url' ILIKE '%agencies%'
- "file upload" / "media upload" → metadata->>'url' ILIKE '%upload%'
- User signup logs: metadata->'responseBody'->'user'->>'name' contains the user name, '->>'id' contains their ID.
- Upload logs: metadata->'responseBody'->>'userId' is the uploader's ID.
- Correlate uploader name: JOIN upload logs with signup logs on the user ID using a CTE.

## Counting unique users from logs
- Do NOT use metadata->>'userId' at root level for counting (often null).
- Use COALESCE(metadata->'responseBody'->'user'->>'id', metadata->'responseBody'->>'userId') for log-based user counts.
- For platform-level user counts: COUNT(*) FROM users.

## Absolute rules
1. Only generate SELECT queries. No INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE.
2. If querying logs, ALWAYS include WHERE logs.project_id = '${projectId}'.
3. Queries on users/projects/api_keys do NOT need project_id filtering (they are platform-wide tables).
4. LIMIT results to 50 rows maximum.
5. All date intervals relative to NOW(). "today" = created_at >= NOW() - INTERVAL '1 day'.
6. Return ONLY this JSON structure:
{
  "sql": "SELECT ...",
  "explanation": "Brief plain-English explanation of what the query does",
  "fallback_keywords": ["list", "of", "search", "terms", "if", "0", "results"]
}`;
  }

  // -------------------------------------------------------------------------
  // Build the summarization prompt
  // -------------------------------------------------------------------------
  private buildSummarizePrompt(
    prompt: string,
    generatedSql: string,
    rows: any[],
    intent: QueryIntent
  ): string {
    const intentHint: Record<QueryIntent, string> = {
      platform_business:
        "This is a business/platform question. Give crisp metrics, counts, and lists. Use bullet points or short sentences.",
      user_activity:
        "This is a user-activity question. Present the timeline step-by-step, ordered chronologically.",
      technical_logs:
        "This is a technical/observability question. Be precise: include counts, service names, error messages, and latencies where relevant.",
      general:
        "Answer directly and concisely.",
    };

    return `You are LogSense Observability AI – a friendly, precise assistant for developers and product teams.

The user asked: "${prompt}"

To answer, we ran this SQL query:
\`\`\`sql
${generatedSql}
\`\`\`

Results from the database (up to 30 rows shown):
${JSON.stringify(this.minifyLogRows(rows), null, 2)}

Intent hint: ${intentHint[intent]}

Formatting rules:
1. **Direct Yes/No first**: For yes/no questions, lead with "Yes" or "No", then a 1-sentence explanation.
2. **Lists**: For list questions, show a clean bulleted list. No chatty introductions.
3. **Counts / metrics**: State the number prominently (e.g. "**47 users** registered today").
4. **Timeline**: For user-activity questions, use a numbered step-by-step list ordered by time.
5. **Zero results**: If there are no rows, say so clearly and suggest why (e.g. no matching logs in this time range).
6. **No preamble**: Never start with "Sure, here is …" or similar fluff. Get straight to the answer.
7. **Sensitive data**: Never echo back password hashes or key_hash values.`;
  }

  // -------------------------------------------------------------------------
  // Main entry point
  // -------------------------------------------------------------------------
  async queryLogs(projectId: string, prompt: string): Promise<AiChatResult> {
    const groq = this.getClient();
    if (!groq) {
      return {
        success: false,
        errorType: "CONFIG_ERROR",
        message:
          "Groq API key is not configured. Please add GROQ_API_KEY to your logsense-server .env file to enable AI Log Querying.",
      };
    }

    // ── Step 1: Classify intent ──────────────────────────────────────────
    const intent = await this.classifyIntent(groq, prompt);

    // ── Step 2: Translate natural language → SQL ─────────────────────────
    const systemPrompt = this.buildSqlTranslationPrompt(projectId, intent);

    let generatedSql = "";
    let explanation = "";
    let parsed: any = {};

    try {
      const { text: responseText, modelUsed } = await this.generateWithFallback(
        groq,
        [systemPrompt, `User question: "${prompt}"`],
        true
      );
      console.log(`🤖 SQL generation successful using model: ${modelUsed}`);

      parsed = this.parseJsonResponse(responseText);
      generatedSql = parsed.sql?.trim() || "";
      explanation = parsed.explanation || "";

      if (!generatedSql) {
        return {
          success: false,
          errorType: "LLM_ERROR",
          message: "Failed to generate a valid SQL query from your prompt.",
        };
      }
    } catch (error: any) {
      console.error("❌ AI SQL generation error:", error);
      return {
        success: false,
        errorType: "LLM_ERROR",
        message: `Failed to translate your request into SQL: ${error.message}`,
      };
    }

    // ── Step 3: Security validation ──────────────────────────────────────
    const cleanSql = generatedSql.toLowerCase();

    const isReadOnly =
      /^\s*select\b/i.test(generatedSql) &&
      !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i.test(
        cleanSql
      );

    // For logs queries, project_id scoping is mandatory.
    // For platform/business queries (users/projects tables), we skip the project_id check.
    const queriesLogTable = cleanSql.includes("from logs") || cleanSql.includes("join logs");
    const isScoped =
      !queriesLogTable ||
      (cleanSql.includes("project_id") && cleanSql.includes(projectId.toLowerCase()));

    if (!isReadOnly || !isScoped) {
      return {
        success: false,
        errorType: "SECURITY_ERROR",
        message: "Generated query failed security checks (must be read-only and project-scoped).",
        sql: generatedSql,
        explanation,
      };
    }

    // ── Step 4: Execute SQL ───────────────────────────────────────────────
    let queryRows: any[] = [];
    try {
      const result = await db.query(generatedSql);
      queryRows = result.rows;
    } catch (error: any) {
      console.error("❌ SQL execution error:", error);
      return {
        success: false,
        errorType: "DB_ERROR",
        message: `Database query execution failed: ${error.message}`,
        sql: generatedSql,
        explanation,
      };
    }

    // ── Step 5: Fuzzy fallback if 0 rows returned ─────────────────────────
    if (
      queryRows.length === 0 &&
      queriesLogTable &&
      parsed.fallback_keywords &&
      Array.isArray(parsed.fallback_keywords) &&
      parsed.fallback_keywords.length > 0
    ) {
      const validKeywords = parsed.fallback_keywords.filter(
        (kw: any) => typeof kw === "string" && kw.trim().length > 1
      );

      if (validKeywords.length > 0) {
        console.log(
          `⚠️ Primary query returned 0 rows. Fuzzy fallback on keywords:`,
          validKeywords
        );
        const keywordConditions = validKeywords
          .map((kw: string) => {
            const escaped = kw.replace(/'/g, "''");
            return `(message ILIKE '%${escaped}%' OR metadata::text ILIKE '%${escaped}%')`;
          })
          .join(" OR ");

        const fallbackSql = `SELECT id, level, service, message, metadata, created_at FROM logs WHERE project_id = '${projectId}' AND (${keywordConditions}) ORDER BY created_at DESC LIMIT 50;`;

        try {
          const fallbackResult = await db.query(fallbackSql);
          if (fallbackResult.rows.length > 0) {
            console.log(
              `✅ Fuzzy fallback matched ${fallbackResult.rows.length} rows.`
            );
            queryRows = fallbackResult.rows;
            generatedSql = fallbackSql;
            explanation = `Primary query returned no results. Fell back to fuzzy text search for: ${validKeywords.join(", ")}`;
          }
        } catch (fallbackErr) {
          console.error("❌ Fuzzy fallback query failed:", fallbackErr);
        }
      }
    }

    // ── Step 6: Summarize results in plain English ────────────────────────
    try {
      const summarizePrompt = this.buildSummarizePrompt(
        prompt,
        generatedSql,
        queryRows,
        intent
      );
      const { text: answer, modelUsed } = await this.generateWithFallback(
        groq,
        [summarizePrompt],
        false
      );
      console.log(`🤖 Summary generation successful using model: ${modelUsed}`);

      return {
        success: true,
        answer,
        sql: generatedSql,
        explanation,
        data: queryRows,
      };
    } catch (error: any) {
      console.error("❌ Summary generation error:", error);
      return {
        success: true, // DB data was retrieved successfully
        answer: `Query executed successfully but summarization failed: ${error.message}. Raw results are included below.`,
        sql: generatedSql,
        explanation,
        data: queryRows,
      };
    }
  }
}

export const aiService = new AiService();
