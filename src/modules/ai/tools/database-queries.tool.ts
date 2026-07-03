import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class DatabaseQueriesTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    if (entities.threshold) {
      const { sql, rows } = await aiLogsRepository.getSlowDatabaseQueries(
        projectId, entities.threshold, entities.timeRange, entities.limit ?? 20
      );
      return { sql, rows, explanation: `Database queries slower than ${entities.threshold}ms in the last ${entities.timeRange ?? "1 day"}` };
    }
    const { sql, rows } = await aiLogsRepository.getDatabaseQueries(
      projectId, entities.timeRange, entities.limit ?? 20
    );
    return { sql, rows, explanation: `Database queries in the last ${entities.timeRange ?? "1 day"}, sorted by duration` };
  }
}
