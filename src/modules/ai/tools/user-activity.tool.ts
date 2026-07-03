import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class UserActivityTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const identifier = entities.userId ?? entities.userEmail ?? entities.userName ?? "";
    if (!identifier) {
      return { sql: "", rows: [], explanation: "No user identifier found in question" };
    }
    const { sql, rows } = await aiLogsRepository.getUserActivity(
      projectId, identifier, entities.timeRange
    );
    return { sql, rows, explanation: `Chronological activity for user "${identifier}" in the last ${entities.timeRange ?? "1 day"}` };
  }
}
