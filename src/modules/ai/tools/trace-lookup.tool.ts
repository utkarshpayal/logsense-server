import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class TraceLookupTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const traceId = entities.traceId ?? "";
    if (!traceId) {
      return { sql: "", rows: [], explanation: "No trace ID provided" };
    }
    const { sql, rows } = await aiLogsRepository.getTrace(projectId, traceId);
    return { sql, rows, explanation: `All log entries for trace ${traceId}` };
  }
}
