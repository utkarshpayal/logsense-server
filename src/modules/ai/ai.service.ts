import { groqClient } from "./groq.client";
import { aiOrchestrator } from "./agent/orchestrator";
import { AiChatResult } from "./types/agent.types";

/**
 * AiService — thin wrapper over the new Agent Orchestrator.
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

    // Delegate entirely to the new AI Orchestrator
    return await aiOrchestrator.process(projectId, prompt);
  }
}

export const aiService = new AiService();
