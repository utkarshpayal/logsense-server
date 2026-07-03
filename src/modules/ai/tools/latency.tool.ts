import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class LatencyTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiLogsRepository.getAverageLatency(
      projectId, entities.timeRange, entities.service
    );
    const svc = entities.service ? ` for ${entities.service}` : "";
    return { sql, rows, explanation: `Latency metrics${svc} in the last ${entities.timeRange ?? "1 day"}` };
  }
}
