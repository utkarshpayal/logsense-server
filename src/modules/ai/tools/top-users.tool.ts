import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class TopUsersTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getTopUsers(
      projectId, entities.timeRange, entities.limit ?? 10
    );
    return { sql, rows, explanation: `Most active users in the last ${entities.timeRange ?? "1 day"} (extracted from log metadata)` };
  }
}
