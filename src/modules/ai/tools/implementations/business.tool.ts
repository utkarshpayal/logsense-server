import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { businessRepository } from "../../repositories/business.repository";

export class BusinessTool implements AgentTool {
  name = "BusinessTool";
  description = "Fetches project and API key information.";
  intents: Intent[] = ["BUSINESS", "PROJECT", "API_KEY"];

  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    try {
      const [project, apiKeys] = await Promise.all([
        businessRepository.getProjectInfo(projectId),
        businessRepository.getApiKeys(projectId)
      ]);
      
      return {
        toolName: this.name,
        success: true,
        data: { project, apiKeys },
        explanation: "Retrieved business data.",
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
