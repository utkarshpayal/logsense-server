import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class MostActiveHostTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getMostActiveHost(
      projectId, entities.timeRange
    );
    return { sql, rows, explanation: `Hosts/servers ranked by request volume in the last ${entities.timeRange ?? "1 day"}` };
  }
}
