import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { logsRepository } from "../../repositories/logs.repository";

export class LogsTool implements AgentTool {
  name = "LogsTool";
  description = "Fetches latest logs or searches for specific logs.";
  intents: Intent[] = ["LOGS"];

  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    try {
      let data;
      if (entities.searchTerm) {
        data = await logsRepository.searchLogs(projectId, entities);
      } else {
        data = await logsRepository.getLatestLogs(projectId, entities);
      }
      return {
        toolName: this.name,
        success: true,
        data,
        explanation: "Retrieved logs from the database.",
      };
    } catch (e: any) {
      return {
        toolName: this.name,
        success: false,
        data: [],
        error: e.message,
      };
    }
  }
}
