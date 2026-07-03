import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class MostActiveServiceTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getMostActiveService(
      projectId, entities.timeRange
    );
    return { sql, rows, explanation: `Services ranked by request volume in the last ${entities.timeRange ?? "1 day"}` };
  }
}
