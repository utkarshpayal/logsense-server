import { groqClient } from "../groq.client";
import { ClassificationResult, ExtractedEntities, Intent } from "../classifier/intent.types";
import { entityExtractor } from "../classifier/entity-extractor";
import { conversationMemory } from "./memory";

const PLANNER_PROMPT = `You are the AI Planner for LogSense, an observability platform.
Your job is to break down the user's question into one or more capability intents, and extract relevant entities.

AVAILABLE INTENTS:
- BUSINESS: For project info, API keys.
- LOGS: For searching logs, viewing latest logs or errors.
- METRICS: For error rates, latency, request counts, slow services.
- TRACE: For looking up a specific trace ID.
- ISSUE: For seeing top/frequent issues.
- GENERAL_KNOWLEDGE: For generic programming/tech questions, conversational pleasantries.
- DOCUMENTATION: For questions about how to use LogSense or its SDK.
- UNKNOWN: Cannot determine intent.

RULES:
1. If the question requires multiple types of data, return multiple intents.
   Example: "Why are payments failing?" -> ["LOGS", "METRICS", "ISSUE"]
2. If it's a general question like "What is Redis?", return ["GENERAL_KNOWLEDGE"].
3. If it asks about SDK setup, return ["DOCUMENTATION"].
4. Extract entities like service names, trace IDs, search terms, and time ranges.

Return ONLY valid JSON in this exact format:
{
  "intents": ["INTENT_1", "INTENT_2"],
  "confidence": 0.95,
  "extractedEntities": {
    "service": "payment",
    "searchTerm": "failing"
  }
}

`;

export class AiPlanner {
  async plan(projectId: string, prompt: string): Promise<ClassificationResult> {
    try {
      const history = conversationMemory.formatHistoryForPrompt(projectId);
      
      const fullPrompt = `${PLANNER_PROMPT}
Previous Conversation Context:
${history}

User question: "${prompt}"`;

      const { text } = await groqClient.generate(fullPrompt, true);
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
