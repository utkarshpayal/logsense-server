import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { logsRepository } from "../../repositories/logs.repository";

export class LogsTool implements AgentTool {
  name = "LogsTool";
  description = "Fetches latest logs or searches for specific logs.";
  intents: Intent[] = ["LOGS"];

  async execute(projectId: string, entities: ExtractedEntities, originalPrompt?: string): Promise<ToolResult> {
    try {
      let data;
      const isCountOrAggregateQuery = originalPrompt && (
        /how\s+many/i.test(originalPrompt) ||
        /count/i.test(originalPrompt) ||
        /total/i.test(originalPrompt) ||
        /number\s+of/i.test(originalPrompt) ||
        /any\b/i.test(originalPrompt) ||
        /anyone/i.test(originalPrompt) ||
        /list\s+all/i.test(originalPrompt) ||
        /show\s+all/i.test(originalPrompt)
      );

      const modifiedEntities = { ...entities };
      if (isCountOrAggregateQuery && (!entities.limit || entities.limit === 50)) {
        modifiedEntities.limit = 200;
      }

      if (modifiedEntities.searchTerm) {
        data = await logsRepository.searchLogs(projectId, modifiedEntities);
      } else {
        data = await logsRepository.getLatestLogs(projectId, modifiedEntities);
      }
      return {
        toolName: this.name,
        success: true,
        data,
        explanation: `Retrieved ${data.length} logs from the database (limit: ${modifiedEntities.limit}).`,
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
