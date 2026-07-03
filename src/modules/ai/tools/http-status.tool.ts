import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class HttpStatusTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getStatusCodeBreakdown(
      projectId, entities.timeRange
    );
    return { sql, rows, explanation: `HTTP status code breakdown in the last ${entities.timeRange ?? "1 day"}` };
  }
}
