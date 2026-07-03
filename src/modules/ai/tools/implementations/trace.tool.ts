import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { traceRepository } from "../../repositories/trace.repository";

export class TraceTool implements AgentTool {
  name = "TraceTool";
  description = "Fetches distributed trace logs for a specific traceId.";
  intents: Intent[] = ["TRACE"];

  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    try {
      const traceLogs = await traceRepository.getTrace(projectId, entities);
      return {
        toolName: this.name,
        success: true,
        data: { traceLogs },
        explanation: "Retrieved trace logs.",
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
