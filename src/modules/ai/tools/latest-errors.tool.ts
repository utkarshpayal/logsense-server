import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class LatestErrorsTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getLatestErrors(
      projectId, entities.timeRange, entities.limit ?? 20
    );
    return { sql, rows, explanation: `Latest error logs in the last ${entities.timeRange ?? "1 day"}` };
  }
}
