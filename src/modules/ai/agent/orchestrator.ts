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
    console.log(`🧠 [Planner] Extracted Entities: ${JSON.stringify(extractedEntities, null, 2)}`);

    // 2. Tool Selection
    const tools = toolRegistry.getToolsForIntents(intents);
    let toolResults: ToolResult[] = [];

    // 3. Execution (Parallel) & Fallback Handling
    if (confidence < 0.75 || intents.includes("UNKNOWN") || tools.length === 0) {
      console.log("⚠️ [Orchestrator] Low confidence or UNKNOWN intent. Triggering dynamic SQL fallback.");
      try {
        const fallbackResult = await fallbackSqlGenerator.generate(projectId, prompt);
        console.log(`🔌 [Orchestrator] SQL Fallback executed successfully. Returned ${Array.isArray(fallbackResult.data) ? fallbackResult.data.length : '1'} records.`);
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
        tools.map(async (tool) => {
          console.log(`▶️ [Orchestrator] Starting tool ${tool.name}...`);
          const res = await tool.execute(projectId, extractedEntities, prompt);
          console.log(`⏹️ [Orchestrator] Tool ${tool.name} finished. Success: ${res.success}. Count/Data: ${Array.isArray(res.data) ? res.data.length : (res.data ? 'Object' : '0')}`);
          return res;
        })
      );

      // 3b. Semantic Search Fallback
      // If none of the deterministic tools found any data, fallback to fuzzy semantic search
      const hasData = toolResults.some(r => {
        if (!r.success || !r.data) return false;
        
        if (r.toolName === "LogsTool") {
          return Array.isArray(r.data) && r.data.length > 0;
        }
        
        if (r.toolName === "MetricsTool") {
          // Check if there are actual metric values present
          const hasErrors = r.data.errorRate && (
            Array.isArray(r.data.errorRate) 
              ? r.data.errorRate.length > 0 
              : Object.keys(r.data.errorRate).length > 0
          );
          const hasSlow = Array.isArray(r.data.slowServices) && r.data.slowServices.length > 0;
          return hasErrors || hasSlow;
        }

        if (Array.isArray(r.data)) return r.data.length > 0;
        return Object.keys(r.data).length > 0;
      });

      if (!hasData) {
        console.log("⚠️ [Orchestrator] Exact tool matches returned no data. Falling back to Semantic Search.");
        const semanticTools = toolRegistry.getToolsForIntents(["SEMANTIC_SEARCH"]);
        const semanticTool = semanticTools[0];
        if (semanticTool) {
          console.log(`▶️ [Orchestrator] Starting tool ${semanticTool.name}...`);
          const semanticResult = await semanticTool.execute(projectId, extractedEntities, prompt);
          console.log(`⏹️ [Orchestrator] Tool ${semanticTool.name} finished. Success: ${semanticResult.success}. Count: ${Array.isArray(semanticResult.data) ? semanticResult.data.length : 0}`);
          toolResults = [semanticResult];
        }
      }
    }

    // 4. Context Building
    const contextString = contextBuilder.build(toolResults);
    console.log(`📝 [Orchestrator] Context built. Total length: ${contextString.length} chars.`);

    // 5. Final Summarization (LLM)
    const history = conversationMemory.formatHistoryForPrompt(projectId);
    
    let answer: string;
    try {
      console.log(`💬 [Orchestrator] Sending to Summarizer...`);
      answer = await summarizer.summarizeContext(prompt, contextString, history);
      console.log(`💡 [Orchestrator] Summarizer responded successfully.`);
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
