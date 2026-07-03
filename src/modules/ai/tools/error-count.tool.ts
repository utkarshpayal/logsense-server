import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class ErrorCountTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getErrorCount(
      projectId, entities.timeRange
    );
    return { sql, rows, explanation: `Total error count in the last ${entities.timeRange ?? "1 day"}` };
  }
}
