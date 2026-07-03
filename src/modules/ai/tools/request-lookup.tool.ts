import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class RequestLookupTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const requestId = entities.requestId ?? "";
    if (!requestId) {
      return { sql: "", rows: [], explanation: "No request ID provided" };
    }
    const { sql, rows } = await aiLogsRepository.getRequest(projectId, requestId);
    return { sql, rows, explanation: `All log entries for request ${requestId}` };
  }
}
