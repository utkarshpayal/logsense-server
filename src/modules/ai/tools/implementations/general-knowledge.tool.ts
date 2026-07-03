import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { groqClient } from "../../groq.client";

export class GeneralKnowledgeTool implements AgentTool {
  name = "GeneralKnowledgeTool";
  description = "Answers general knowledge and conversational questions using an LLM.";
  intents: Intent[] = ["GENERAL_KNOWLEDGE"];

  async execute(projectId: string, entities: ExtractedEntities, originalPrompt?: string): Promise<ToolResult> {
    try {
      if (!originalPrompt) {
        throw new Error("Original prompt is required for general knowledge.");
      }

      const prompt = `You are LogSense AI, a helpful assistant. Please answer the user's question directly.
      Question: ${originalPrompt}`;
      
      const { text } = await groqClient.generate(prompt);
      
      return {
        toolName: this.name,
        success: true,
        data: { answer: text },
        explanation: "Answered using general knowledge.",
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
