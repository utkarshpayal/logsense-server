import { groqClient } from "../groq.client";
import { ClassificationResult, ExtractedEntities, Intent } from "../classifier/intent.types";
import { entityExtractor } from "../classifier/entity-extractor";
import { conversationMemory } from "./memory";

const PLANNER_PROMPT = `You are the AI Planner for LogSense, an observability platform.
Your job is to break down the user's question into one or more capability intents, and extract relevant entities.

AVAILABLE INTENTS:
- BUSINESS: For platform-level queries about users, projects, api_keys.
- LOGS: For viewing, counting, or searching logs (e.g. login events, errors, signups, transactions).
- METRICS: For performance metrics, error rates, latency, request counts.
- TRACE: For looking up a specific trace ID.
- ISSUE: For seeing frequent or top errors/issues.
- GENERAL_KNOWLEDGE: For general conversation, greeting, or generic logs questions (e.g. "what is a log").
- DOCUMENTATION: For SDK setup or how to use LogSense.
- UNKNOWN: Default fallback if query is unclear.

RULES:
1. If the question is about specific events, occurrences, counts, or lists (e.g. "how many users logged in", "show payment logs", "any errors today"), you MUST use the "LOGS" intent.
2. If it's a general question about how to set up the SDK, return ["DOCUMENTATION"].
3. Extract entities like service names, trace IDs, search terms (e.g. "login", "signup", "payment"), and time ranges (e.g. "today", "yesterday", "24h", "1h").
4. Always extract the search term if the query mentions specific actions or keywords. E.g. "who loggedin today" -> searchTerm is "loggedin" or "login".

Return ONLY valid JSON in this exact format:
{
  "intents": ["LOGS"],
  "confidence": 0.95,
  "extractedEntities": {
    "searchTerm": "loggedin",
    "timeRange": "today"
  }
}
`;

export class AiPlanner {
  async plan(projectId: string, prompt: string): Promise<ClassificationResult> {
    try {
      const history = conversationMemory.formatHistoryForPrompt(projectId);
      const now = new Date();
      const currentFullTime = `${now.toUTCString()} (Local: ${now.toLocaleString()})`;
      const todayDate = now.toISOString().split('T')[0];

      const fullPrompt = `${PLANNER_PROMPT}
Current Time Context:
- Current Time: ${currentFullTime}
- Today's Date: ${todayDate}

Previous Conversation Context:
${history}

User question: "${prompt}"`;

      const { text } = await groqClient.generate(fullPrompt, true, {
        temperature: 0,
        num_predict: 256,
      });
      const parsed = groqClient.parseJson(text);

      const rawIntents = Array.isArray(parsed?.intents) ? parsed.intents : [parsed?.intent || "UNKNOWN"];
      
      // Filter out invalid intents
      const validIntents: Intent[] = rawIntents.filter((i: string) => 
        ["BUSINESS", "LOGS", "METRICS", "DASHBOARD", "TRACE", "ISSUE", "USER", "PROJECT", "API_KEY", "DOCUMENTATION", "GENERAL_KNOWLEDGE", "UNKNOWN"].includes(i)
      ) as Intent[];

      if (validIntents.length === 0) validIntents.push("UNKNOWN");

      const confidence = typeof parsed?.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0;
        
      const extractedEntities = entityExtractor.extract(parsed);

      console.log(`🧠 [Planner] intents=${validIntents.join(",")} confidence=${confidence}`);
      return { intents: validIntents, confidence, extractedEntities };
    } catch (e: any) {
      console.error("❌ [Planner] Failed:", e.message);
      return { intents: ["UNKNOWN"], confidence: 0, extractedEntities: {} };
    }
  }
}

export const aiPlanner = new AiPlanner();
