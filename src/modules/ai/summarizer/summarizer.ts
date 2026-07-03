import { groqClient } from "../groq.client";
import { ClassificationResult } from "../classifier/intent.types";
import { ToolResult } from "../tools/base.tool";
import { extractGroundTruth, detectContradiction, minifyRows } from "./ground-truth";

const INTENT_STYLE: Record<string, string> = {
  SLOW_SERVICES:       "List services with their avg/max latency in a table. Highlight worst offenders.",
  SLOW_ENDPOINTS:      "List endpoints with avg/max latency. Sort by slowest first.",
  TOP_ERRORS:          "List error messages with occurrence count and last seen time.",
  LATEST_ERRORS:       "Show the most recent errors chronologically with service, message, and timestamp.",
  LATEST_WARNINGS:     "Show the most recent warnings chronologically.",
  ERROR_COUNT:         "State the error count prominently. Bold the number.",
  REQUEST_COUNT:       "State the total request count prominently. Bold the number.",
  HTTP_STATUS:         "Show HTTP status codes with counts. Group 2xx/3xx/4xx/5xx.",
  TOP_ENDPOINTS:       "List the top endpoints by traffic with error counts.",
  TOP_USERS:           "List most active users with request and error counts.",
  TOP_API_KEYS:        "List API keys by usage with their environment label.",
  SERVICE_HEALTH:      "For each service, show error rate percentage and avg latency. Flag unhealthy services.",
  REQUEST_TIMELINE:    "Describe the traffic trend. Note spikes or drops.",
  TRACE_LOOKUP:        "Show the full trace as a numbered chronological step list.",
  REQUEST_LOOKUP:      "Show all log entries for this request in order.",
  USER_ACTIVITY:       "Show the user's actions as a numbered chronological timeline.",
  DATABASE_QUERIES:    "List database queries with table, duration, and service.",
  LOG_SEARCH:          "Show matching log entries with level, service, and message.",
  PROJECT_INFO:        "Describe the project and its owner.",
  API_KEY_INFO:        "List all API keys with environment and active status.",
  MOST_ACTIVE_SERVICE: "Name the most active service with its request count.",
  MOST_ACTIVE_HOST:    "Name the most active host with its request count.",
  LATENCY:             "Show avg, p95, and max latency prominently.",
  REDIS_OPERATIONS:    "Show Redis-related log entries.",
  DEPLOYMENT_ISSUES:   "Show deployment-related errors and warnings.",
  GENERAL_SQL:         "Answer directly and concisely based on the data.",
  UNKNOWN:             "Answer directly and concisely based on the data.",
};

export class Summarizer {
  async summarize(
    prompt: string,
    toolResult: ToolResult,
    classification: ClassificationResult
  ): Promise<string> {
    const { sql, rows, explanation } = toolResult;
    const { intent } = classification;

    const groundTruth = extractGroundTruth(rows);
    const style = INTENT_STYLE[intent] ?? "Answer directly and concisely.";

    const summaryPrompt = `You are LogSense Observability AI. Answer the user's question using ONLY the data below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED GROUND TRUTH — you MUST NOT contradict these facts:
${groundTruth}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User question: "${prompt}"

Data source: ${explanation}
SQL executed:
\`\`\`sql
${sql || "(no SQL — no identifier was provided)"}
\`\`\`

Data returned (up to 30 rows):
${JSON.stringify(minifyRows(rows), null, 2)}

Style guide: ${style}

Rules (strictly follow):
1. MUST be consistent with GROUND TRUTH. Count > 0 → YES. Count = 0 → NO.
2. If yes/no question → start with "Yes" or "No".
3. Bold key numbers: **42 errors**.
4. No preamble: never start with "Sure," / "Of course," / "Great question".
5. Never echo password_hash or key_hash values.
6. If 0 rows → say so clearly and note the time window checked.`;

    const { text: answer } = await groqClient.generate(summaryPrompt, false);

    // Auto-retry if answer contradicts data
    if (detectContradiction(answer, rows)) {
      const retry = summaryPrompt +
        "\n\n⚠️ CORRECTION: Your previous response contradicted the GROUND TRUTH. " +
        "The data clearly shows non-zero results. Rewrite starting with \"Yes\" or the actual count.";
      const { text: retried } = await groqClient.generate(retry, false);
      console.log("🔄 [Summarizer] Answer regenerated after contradiction");
      return retried;
    }

    return answer;
  }
}

export const summarizer = new Summarizer();
