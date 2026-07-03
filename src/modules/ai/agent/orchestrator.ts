import { AiChatResult } from "../types/agent.types";
import { aiPlanner } from "./planner";
import { toolRegistry } from "../tools/tool-registry";
import { contextBuilder } from "./context-builder";
import { conversationMemory } from "./memory";
import { summarizer } from "../summarizer/summarizer";
import { fallbackSqlGenerator } from "../fallback/sql-generator";
import { ToolResult } from "../tools/interfaces";

export class AiOrchestrator {
  async process(projectId: string, prompt: string): Promise<AiChatResult> {
    console.log(`\n🚀 [Orchestrator] Starting processing for: "${prompt}"`);

    // 1. Planning & Intent Detection
    const plan = await aiPlanner.plan(projectId, prompt);
    const { intents, confidence, extractedEntities } = plan;

    // 2. Tool Selection
    const tools = toolRegistry.getToolsForIntents(intents);
    let toolResults: ToolResult[] = [];

    // 3. Execution (Parallel) & Fallback Handling
    if (confidence < 0.75 || intents.includes("UNKNOWN") || tools.length === 0) {
      console.log("⚠️ [Orchestrator] Low confidence or UNKNOWN intent. Triggering dynamic SQL fallback.");
      try {
        const fallbackResult = await fallbackSqlGenerator.generate(projectId, prompt);
        toolResults = [fallbackResult];
      } catch (e: any) {
        console.error("❌ [Orchestrator] Fallback failed:", e.message);
        return {
          success: false,
          errorType: "DB_ERROR",
          message: `Could not answer question. Fallback failed: ${e.message}`,
        };
      }
    } else {
      console.log(`⚙️ [Orchestrator] Executing tools in parallel: ${tools.map(t => t.name).join(", ")}`);
      // Execute all tools concurrently
      toolResults = await Promise.all(
        tools.map(tool => tool.execute(projectId, extractedEntities, prompt))
      );
    }

    // 4. Context Building
    const contextString = contextBuilder.build(toolResults);

    // 5. Final Summarization (LLM)
    const history = conversationMemory.formatHistoryForPrompt(projectId);
    
    // Create a modified toolResult structure for the existing summarizer signature
    // or we can update the summarizer directly. We'll update the summarizer to take contextString.
    let answer: string;
    try {
      answer = await summarizer.summarizeContext(prompt, contextString, history);
    } catch (e: any) {
      console.error("❌ [Orchestrator] Summarizer error:", e.message);
      answer = `Processing succeeded, but summarization failed: ${e.message}`;
    }

    // 6. Memory Update
    conversationMemory.addInteraction(projectId, prompt, answer);

    // Consolidate data for response
    const combinedData = toolResults.reduce((acc, res) => {
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          acc = acc.concat(res.data);
        } else {
          acc.push(res.data);
        }
      }
      return acc;
    }, [] as any[]);

    return {
      success: true,
      answer,
      data: combinedData,
      message: "Successfully processed.",
    };
  }
}

export const aiOrchestrator = new AiOrchestrator();
