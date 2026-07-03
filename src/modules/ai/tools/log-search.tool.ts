import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class LogSearchTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const term = entities.searchTerm ?? "";
    if (!term) {
      return { sql: "", rows: [], explanation: "No search term provided" };
    }
    const { sql, rows } = await aiLogsRepository.searchLogs(
      projectId, term, entities.timeRange, entities.limit ?? 30
    );
    return { sql, rows, explanation: `Logs matching "${term}" in the last ${entities.timeRange ?? "1 day"}` };
  }
}
