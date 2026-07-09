import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { ollamaClient } from "../../ollama.client";

export class GeneralKnowledgeTool implements AgentTool {
  name = "GeneralKnowledgeTool";
  description = "Answers general knowledge and conversational questions using the local Ollama LLM.";
  intents: Intent[] = ["GENERAL_KNOWLEDGE"];

  async execute(
    projectId: string,
    entities: ExtractedEntities,
    originalPrompt?: string
  ): Promise<ToolResult> {
    try {
      if (!originalPrompt) {
        throw new Error("Original prompt is required for general knowledge.");
      }

      const prompt = `You are LogSense AI, a helpful observability platform assistant.
Answer the user's question directly and concisely.

Question: ${originalPrompt}`;

      const { text } = await ollamaClient.generate(prompt);

      return {
        toolName: this.name,
        success: true,
        data: { answer: text },
        explanation: "Answered using local Ollama LLM.",
      };
    } catch (e: any) {
      return {
        toolName: this.name,
        success: false,
        data: {},
        error: e.message,
      };
    }
  }
}
