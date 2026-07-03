import { groqClient } from "./groq.client";
import { intentClassifier } from "./classifier/intent.classifier";
import { aiToolRouter, FALLBACK } from "./router/tool.router";
import { fallbackSqlGenerator } from "./fallback/sql-generator";
import { summarizer } from "./summarizer/summarizer";
import { ToolResult } from "./tools/base.tool";
import { ExtractedEntities } from "./classifier/intent.types";

export interface AiChatResult {
  success: boolean;
  message?: string;
  answer?: string;
  explanation?: string;
  data?: any[];
  intent?: string;
  confidence?: number;
  errorType?: "CONFIG_ERROR" | "TOOL_ERROR" | "DB_ERROR" | "LLM_ERROR";
}

/**
 * AiService — thin orchestrator.
 *
 * Pipeline:
 *   1. Classify intent + extract entities  (LLM call #1)
 *   2. Route to tool  (pure code)
 *   3. Tool executes  (no LLM — deterministic SQL)
 *   4. Summarize result  (LLM call #2, grounded on facts)
 */
class AiService {
  async queryLogs(projectId: string, prompt: string): Promise<AiChatResult> {
    // Guard: Groq must be configured
    if (!groqClient.isConfigured()) {
      return {
        success: false,
        errorType: "CONFIG_ERROR",
        message: "GROQ_API_KEY is not configured on this server.",
      };
    }

    // ── Step 1: Classify intent ──────────────────────────────────────────
    const classification = await intentClassifier.classify(prompt);
    const { intent, confidence, extractedEntities } = classification;

    // ── Step 2: Route to tool ────────────────────────────────────────────
    const target = aiToolRouter.route(intent, confidence);

    // ── Step 3: Execute tool or fallback ─────────────────────────────────
    let toolResult: ToolResult;
    try {
      if (target === FALLBACK) {
        toolResult = await fallbackSqlGenerator.generate(projectId, prompt);
      } else {
        toolResult = await target.execute(projectId, extractedEntities as ExtractedEntities);
      }
    } catch (e: any) {
      console.error("❌ [AiService] Tool/fallback error:", e.message);
      return {
        success: false,
        errorType: target === FALLBACK ? "DB_ERROR" : "TOOL_ERROR",
        message: e.message,
        intent,
        confidence,
      };
    }

    // ── Step 4: Summarize ────────────────────────────────────────────────
    let answer: string;
    try {
      answer = await summarizer.summarize(prompt, toolResult, classification);
    } catch (e: any) {
      console.error("❌ [AiService] Summarizer error:", e.message);
      answer = `Query succeeded but summarization failed: ${e.message}`;
    }

    return {
      success: true,
      answer,
      explanation: toolResult.explanation,
      data: toolResult.rows,
      intent,
      confidence,
    };
  }
}

export const aiService = new AiService();
