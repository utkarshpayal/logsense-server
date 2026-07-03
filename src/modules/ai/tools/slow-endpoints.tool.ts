import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class SlowEndpointsTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const threshold = entities.threshold ?? 500;
    const { sql, rows } = await aiLogsRepository.getSlowEndpoints(
      projectId, threshold, entities.timeRange, entities.limit ?? 10
    );
    return { sql, rows, explanation: `Endpoints with average latency above ${threshold}ms in the last ${entities.timeRange ?? "1 day"}` };
  }
}
