import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class TopEndpointsTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getTopEndpoints(
      projectId, entities.timeRange, entities.limit ?? 10
    );
    return { sql, rows, explanation: `Top endpoints by request volume in the last ${entities.timeRange ?? "1 day"}` };
  }
}
