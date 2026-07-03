import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { metricsRepository } from "../../repositories/metrics.repository";

export class MetricsTool implements AgentTool {
  name = "MetricsTool";
  description = "Fetches analytical metrics like error rates and slow services.";
  intents: Intent[] = ["METRICS"];

  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    try {
      // In a real scenario, we'd use entities to route to the correct repository method.
      // For simplicity, we'll fetch both here.
      const [errorRate, slowServices] = await Promise.all([
        metricsRepository.getErrorRate(projectId),
        metricsRepository.getSlowServices(projectId)
      ]);
      
      return {
        toolName: this.name,
        success: true,
        data: { errorRate, slowServices },
        explanation: "Retrieved metrics from the database.",
      };
    } catch (e: any) {
      return {
        toolName: this.name,
        success: false,
        data: {},
        error: e.message,
      };
    }
  }
}
