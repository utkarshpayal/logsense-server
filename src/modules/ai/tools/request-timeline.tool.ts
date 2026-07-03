import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiLogsRepository } from "../repositories/ai-logs.repository";

export class RequestTimelineTool implements BaseTool {
  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    const timeRange = entities.timeRange ?? "1 day";
    // Choose bucket size based on time range
    const bucket = timeRange.includes("hour") ? "minute" : "hour";
    const { sql, rows } = await aiLogsRepository.getRequestTimeline(
      projectId, timeRange, bucket
    );
    return { sql, rows, explanation: `Request volume timeline (per ${bucket}) over the last ${timeRange}` };
  }
}
