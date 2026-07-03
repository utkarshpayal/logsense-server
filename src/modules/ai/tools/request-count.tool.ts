import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class RequestCountTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getRequestCount(
      projectId, entities.timeRange
    );
    return { sql, rows, explanation: `Total request count in the last ${entities.timeRange ?? "1 day"}` };
  }
}
