import { groqClient } from "../groq.client";
import { ClassificationResult, ExtractedEntities, Intent } from "./intent.types";

const VALID_INTENTS = new Set<Intent>([
  "SLOW_SERVICES", "SLOW_ENDPOINTS", "TOP_ERRORS", "ERROR_COUNT",
  "REQUEST_COUNT", "TOP_ENDPOINTS", "TOP_USERS", "TOP_API_KEYS",
  "LATEST_ERRORS", "LATEST_WARNINGS", "REQUEST_TIMELINE",
  "SERVICE_HEALTH", "DATABASE_QUERIES", "REDIS_OPERATIONS",
  "TRACE_LOOKUP", "REQUEST_LOOKUP", "USER_ACTIVITY",
  "DEPLOYMENT_ISSUES", "HTTP_STATUS", "LATENCY",
  "MOST_ACTIVE_SERVICE", "MOST_ACTIVE_HOST", "LOG_SEARCH",
  "PROJECT_INFO", "API_KEY_INFO", "GENERAL_SQL", "UNKNOWN",
]);

const CLASSIFICATION_PROMPT = `You are an intent classifier for LogSense, a developer observability platform.

Classify the user's question into ONE of these intents and extract entities. Return ONLY valid JSON.

INTENTS (pick the single best match):
- SLOW_SERVICES       → slowest services, which service has high latency
- SLOW_ENDPOINTS      → slowest API endpoints/routes
- TOP_ERRORS          → most frequent errors, common error messages
- ERROR_COUNT         → how many errors, error count today/this week
- REQUEST_COUNT       → how many requests, total traffic
- TOP_ENDPOINTS       → most used endpoints, top routes by traffic
- TOP_USERS           → most active users, who is using the API most
- TOP_API_KEYS        → most used API keys
- LATEST_ERRORS       → latest/recent errors, last N errors, show me errors
- LATEST_WARNINGS     → latest warnings
- REQUEST_TIMELINE    → traffic over time, requests per hour/day
- SERVICE_HEALTH      → is X service healthy, service error rates
- DATABASE_QUERIES    → database queries, slow DB, query latency
- REDIS_OPERATIONS    → redis commands, cache hits/misses
- TRACE_LOOKUP        → find trace, show me trace ID X
- REQUEST_LOOKUP      → find request, show me request ID X
- USER_ACTIVITY       → what did user X do, user timeline, user actions
- DEPLOYMENT_ISSUES   → after deploy, post-deployment errors
- HTTP_STATUS         → HTTP status codes breakdown, 4xx, 5xx
- LATENCY             → average latency, p95 latency, response time
- MOST_ACTIVE_SERVICE → which service is busiest
- MOST_ACTIVE_HOST    → which server/host is busiest
- LOG_SEARCH          → search for keyword, find logs containing X
- PROJECT_INFO        → project details, project info
- API_KEY_INFO        → API key info, list API keys
- GENERAL_SQL         → complex question that needs custom SQL
- UNKNOWN             → cannot determine intent

ENTITIES to extract (include only what's present):
- userId, userName, userEmail → user identifier from question
- service → service name mentioned
- traceId → trace ID (UUID or hex)
- requestId → request ID
- level → log level (error/warn/info/debug)
- timeRange → time window as Postgres interval string: "1 hour", "24 hours", "7 days", "30 days"
- statusCode → HTTP status code number
- endpoint → URL or route path mentioned
- threshold → latency threshold in ms (if mentioned)
- searchTerm → keyword to search for
- environment → production/development/staging
- limit → number of results requested

Return JSON:
{
  "intent": "<INTENT>",
  "confidence": <0.0-1.0>,
  "extractedEntities": { ...only fields present... }
}

User question: "`;

export class IntentClassifier {
  async classify(prompt: string): Promise<ClassificationResult> {
    try {
      const { text } = await groqClient.generate(
        `${CLASSIFICATION_PROMPT}${prompt}"`,
        true
      );
      const parsed = groqClient.parseJson(text);

      const intent = parsed?.intent as Intent;
      const confidence = typeof parsed?.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0;
      const extractedEntities: ExtractedEntities = parsed?.extractedEntities ?? {};

      if (!VALID_INTENTS.has(intent)) {
        console.warn(`⚠️  [Classifier] Unknown intent "${intent}" — defaulting to UNKNOWN`);
        return { intent: "UNKNOWN", confidence: 0, extractedEntities };
      }

      console.log(`🎯 [Classifier] intent=${intent} confidence=${confidence}`);
      return { intent, confidence, extractedEntities };
    } catch (e: any) {
      console.error("❌ [Classifier] Failed:", e.message);
      return { intent: "UNKNOWN", confidence: 0, extractedEntities: {} };
    }
  }
}

export const intentClassifier = new IntentClassifier();
