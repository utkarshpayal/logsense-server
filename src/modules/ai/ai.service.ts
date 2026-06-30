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

class AiService {
  private getClient(): Groq | null {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new Groq({ apiKey });
  }

  private async generateWithFallback(
    groq: Groq,
    contents: string[],
    isJson: boolean = false
  ): Promise<{ text: string; modelUsed: string }> {
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it"
    ];

    let lastError: any = null;
    const messageContent = contents.join("\n");

    for (const modelName of models) {
      try {
        const options: any = {
          messages: [
            {
              role: "user",
              content: messageContent,
            },
          ],
          model: modelName,
        };

        if (isJson) {
          options.response_format = { type: "json_object" };
        }

        const chatCompletion = await groq.chat.completions.create(options);
        const text = chatCompletion.choices[0]?.message?.content || "";
        return { text, modelUsed: modelName };
      } catch (err: any) {
        console.warn(`⚠️ Model ${modelName} failed. Error: ${err.message || err}. Trying next model...`);
        lastError = err;
      }
    }

    throw lastError || new Error("All fallback models failed.");
  }

  private parseJsonResponse(text: string): any {
    let clean = text.trim();
    // Remove markdown code blocks if present (e.g. ```json ... ```)
    if (clean.startsWith("```")) {
      const firstNewline = clean.indexOf("\n");
      if (firstNewline !== -1) {
        clean = clean.slice(firstNewline + 1);
      }
      if (clean.endsWith("```")) {
        clean = clean.slice(0, -3);
      }
      clean = clean.trim();
    }

    try {
      return JSON.parse(clean);
    } catch (err: any) {
      // Parse cleanup fallback: escape any unescaped literal newlines inside double-quoted string values
      try {
        const fixedClean = clean.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
          return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
        });
        return JSON.parse(fixedClean);
      } catch (innerErr) {
        // Fall back to regex brace match
      }

      // Fallback: try to extract JSON using regex for braces
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerErr) {
          // Fall back to original error
        }
      }
      throw err;
    }
  }

  async queryLogs(projectId: string, prompt: string): Promise<AiChatResult> {
    const groq = this.getClient();
    if (!groq) {
      return {
        success: false,
        errorType: "CONFIG_ERROR",
        message: "Groq API key is not configured. Please add GROQ_API_KEY to your logsense-server .env file to enable AI Log Querying.",
      };
    }

    // 1. Ask Groq to translate the NL prompt into a PostgreSQL SELECT query
    const translateSystemPrompt = `You are a PostgreSQL database expert specializing in log analysis.
Your job is to translate a natural language question about application logs into a safe, read-only PostgreSQL SELECT query.

Database Schema:
The database has a table named 'logs' with the following columns:
- id (UUID): Unique log line identifier
- project_id (UUID): The ID of the project the log belongs to. MUST ALWAYS be matched exactly: logs.project_id = '${projectId}'
- api_key_id (UUID): The ID of the API key used
- level (VARCHAR): Log level, e.g. 'debug', 'info', 'warn', 'error'
- message (TEXT): Log message
- service (VARCHAR): Service name (e.g. 'auth-service', 'payment-service')
- environment (VARCHAR): Environment name (e.g. 'production', 'development')
- metadata (JSONB): Structured metadata JSON. Query properties using PostgreSQL JSONB operators, e.g. metadata->>'userId' or metadata->>'user_id' or metadata->>'email' or (metadata->>'amount')::numeric or (metadata->>'latency_ms')::int.
  Note: For auto-instrumented Express request/response logs, response payloads are stored under metadata->'responseBody', which might contain nested user objects (e.g. metadata->'responseBody'->'user'->>'name' or metadata->'responseBody'->'user'->>'id').
  Example log metadata structure for user signups:
  {
    "url": "/api/user/signup",
    "method": "POST",
    "statusCode": 201,
    "responseBody": {
      "user": {
        "id": "6a43a06bb02e343c2c7113fd",
        "name": "Utkarsh Payal",
        "firstName": "Utkarsh",
        "lastName": "Payal",
        "userType": "author"
      }
    }
  }
- trace_id (VARCHAR): Distributed tracing ID
- request_id (VARCHAR): HTTP request ID
- hostname (VARCHAR): Server hostname
- created_at (TIMESTAMPTZ): Timestamp when the log was created

Important Domain & URL Mappings:
- When a user asks about "agencies", "news agencies", "publishers", "list of authors", or "author list", this maps to requests targeting the agencies endpoints (e.g. metadata->>'url' ILIKE '%agencies%'). E.g., the endpoint '/api/user/agencies' fetches the news agencies/publishers list.
- When a user asks about "file upload", "media upload", or "uploaded file", this maps to requests targeting the media upload endpoints (e.g. metadata->>'url' ILIKE '%upload%').
- Log Correlation & User Resolution:
  - In '/api/media/upload' logs, the uploader's ID is stored in metadata->'responseBody'->>'userId'. It does not contain the user's name.
  - In '/api/user/signup' logs, the user's name is stored in metadata->'responseBody'->'user'->>'name' and their ID is in metadata->'responseBody'->'user'->>'id'.
  - If asked "who uploaded a file", write a SQL query that selects the uploader's userId from the upload logs, and correlates/resolves it with the signup logs to find their name (e.g., using a subquery or CTE).
  - Counting unique/total users: Do NOT count using (metadata->>'userId') at the root level, as it does not exist for normal request logs. Instead, count the unique users by extracting from:
    - User signups/logins: (metadata->'responseBody'->'user'->>'id')
    - Media uploads: (metadata->'responseBody'->>'userId')
    - Or use a COALESCE(metadata->'responseBody'->'user'->>'id', metadata->'responseBody'->>'userId') strategy.

Important rules:
1. ONLY generate SELECT queries. DO NOT use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or any database-modifying keywords.
2. The query MUST query the 'logs' table.
3. The query MUST include a filter for project_id = '${projectId}' to ensure scoping.
4. Limit the query results to a maximum of 50 rows (LIMIT 50) to prevent heavy database loads.
5. All dates and intervals should be relative to NOW(). E.g. last 24 hours is created_at >= NOW() - INTERVAL '24 hours'.
6. Do not query tables other than 'logs'.
7. If the user asks what a specific user did, query their logs by filtering on metadata->>'userId', metadata->>'email', metadata->>'user_id', or nested keys like metadata->'responseBody'->'user'->>'name', or use case-insensitive text search (e.g., metadata::text ILIKE '%user_identifier%'), and order the results chronologically (ORDER BY created_at ASC) to show their timeline step-by-step.
8. If the user asks for count/existence (e.g. "more than 5 users"), write a query that counts the distinct users/actions so the summary can directly answer.
9. CRITICAL: The 'metadata' column and any keys extracted using the '->' operator are of type JSONB. You CANNOT use the ILIKE, LIKE, or other text operators directly on JSONB columns/keys. You must ALWAYS either use the '->>' operator (which returns text) or explicitly cast it to text (e.g. metadata::text ILIKE '%...' or (metadata->'responseBody')::text ILIKE '%...'). Never write: metadata->'key' ILIKE '%...'.
10. Return a JSON object with this exact structure:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what the query does",
  "fallback_keywords": ["any specific search terms or identifiers from the prompt, e.g. names, emails, ids, endpoints, or error keywords to use for broad text search if the main query finds 0 results"]
}
11. Prefer case-insensitive fuzzy matching (ILIKE '%search_term%') rather than strict equals (=) when querying names, emails, errors, messages, or URLs, to handle partial matches and minor typos.
12. CRITICAL: When traversing nested JSONB properties, use the '->' operator for all intermediate levels (which returns JSONB) and ONLY use the '->>' operator for the final leaf property (which returns text). For example, use: metadata->'responseBody'->>'userId' or metadata->'responseBody'->'user'->>'id'. NEVER use: metadata->>'responseBody'->>'userId' or use the '->>' operator sequentially, as that will fail with a "text ->> unknown" operator error in PostgreSQL.
`;

    let generatedSql = "";
    let explanation = "";
    let parsed: any = {};

    try {
      const { text: responseText, modelUsed } = await this.generateWithFallback(
        groq,
        [
          translateSystemPrompt,
          `User request: "${prompt}"`
        ],
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
          message: "Failed to generate a valid SQL query from prompt.",
        };
      }
    } catch (error: any) {
      console.error("❌ AI translation error:", error);
      return {
        success: false,
        errorType: "LLM_ERROR",
        message: `Failed to translate request: ${error.message}`,
      };
    }

    // 2. Safety Validation on the SQL Query
    const cleanSql = generatedSql.toLowerCase();
    
    // Ensure it's a SELECT query and doesn't contain forbidden write words
    const isReadOnly = /^\s*select\b/i.test(generatedSql) && 
      !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i.test(cleanSql);

    // Ensure it has the project_id scoping check
    const isScoped = cleanSql.includes("project_id") && cleanSql.includes(projectId.toLowerCase());

    if (!isReadOnly || !isScoped) {
      return {
        success: false,
        errorType: "SECURITY_ERROR",
        message: "Generated query failed security and tenant safety checks.",
        sql: generatedSql,
        explanation,
      };
    }

    // 3. Execute the SQL Query
    let queryRows: any[] = [];
    try {
      const result = await db.query(generatedSql);
      queryRows = result.rows;
    } catch (error: any) {
      console.error("❌ SQL query execution error:", error);
      return {
        success: false,
        errorType: "DB_ERROR",
        message: `Database query execution failed: ${error.message}`,
        sql: generatedSql,
        explanation,
      };
    }

    // Fuzzy matching fallback if primary query returned 0 rows
    if (queryRows.length === 0 && parsed.fallback_keywords && Array.isArray(parsed.fallback_keywords) && parsed.fallback_keywords.length > 0) {
      // Filter out empty or short keywords
      const validKeywords = parsed.fallback_keywords.filter((kw: any) => typeof kw === "string" && kw.trim().length > 1);
      if (validKeywords.length > 0) {
        console.log(`⚠️ Primary query returned 0 rows. Attempting fuzzy fallback matching on keywords:`, validKeywords);
        const keywordConditions = validKeywords.map((kw: string) => {
          const escaped = kw.replace(/'/g, "''");
          return `(message ILIKE '%${escaped}%' OR metadata::text ILIKE '%${escaped}%')`;
        }).join(" OR ");

        const fallbackSql = `SELECT id, level, service, message, metadata, created_at FROM logs WHERE project_id = '${projectId}' AND (${keywordConditions}) ORDER BY created_at DESC LIMIT 50;`;
        
        try {
          const fallbackResult = await db.query(fallbackSql);
          if (fallbackResult.rows.length > 0) {
            console.log(`✅ Fuzzy fallback match succeeded, found ${fallbackResult.rows.length} rows.`);
            queryRows = fallbackResult.rows;
            generatedSql = fallbackSql;
            explanation = `Primary query returned no results. Fell back to fuzzy text search for: ${validKeywords.join(", ")}`;
          }
        } catch (fallbackErr) {
          console.error("❌ Fuzzy fallback query failed:", fallbackErr);
        }
      }
    }

    // 4. Summarize the results back to the user
    try {
      const summarizeSystemPrompt = `You are LogSense Observability AI, a helpful observability assistant.
Your goal is to answer the user's question directly, clearly, and strictly "to the point".

The user asked: "${prompt}"

To answer their question, we executed this SQL query:
\`\`\`sql
${generatedSql}
\`\`\`

Which returned these results from the database:
${JSON.stringify(queryRows, null, 2)}

Strict formatting guidelines:
1. **Direct Yes/No**: If the user is asking a yes/no question (e.g. "did more than 5 users face errors", "is payment-service down"), answer with a direct "Yes" or "No" first, followed by a very brief 1-sentence explanation of the numbers. Do not include verbose headers.
2. **Lists**: If the user asks for a list (e.g. "give the list of users that face error"), list ONLY the requested items (e.g. names, emails, and/or IDs) in a simple bulleted list. Do not include chatty introductions.
3. **Timeline/Sequence**: If the user asks what a specific user did (e.g. "what did user X do in the last 10 min"), tell it api-by-api, log-by-log, ordered chronologically. Format it step-by-step, e.g.:
   - 1. User tried to login (2 times)
   - 2. User accessed dashboard
   - 3. User faced a payment timeout error on Checkout API
4. **No Preambles**: Skip introductions like "Sure, here is the answer" or conversational fluff. Start directly with the answer.`;

      const { text: answer, modelUsed } = await this.generateWithFallback(
        groq,
        [summarizeSystemPrompt],
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
        success: true, // Still success since we got the DB data, but summary failed
        answer: `I executed the SQL query successfully but failed to summarize it: ${error.message}. Here are the raw results:`,
        sql: generatedSql,
        explanation,
        data: queryRows,
      };
    }
  }
}

export const aiService = new AiService();
