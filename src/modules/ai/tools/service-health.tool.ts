import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class ServiceHealthTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getServiceHealth(
      projectId, entities.timeRange
    );
    return { sql, rows, explanation: `Service health (error rate + latency) in the last ${entities.timeRange ?? "1 day"}` };
  }
}
