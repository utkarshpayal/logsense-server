import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { issueRepository } from "../../repositories/issue.repository";

export class IssueTool implements AgentTool {
  name = "IssueTool";
  description = "Fetches the top issues (most frequent errors).";
  intents: Intent[] = ["ISSUE"];

  async execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult> {
    try {
      const topIssues = await issueRepository.getTopIssues(projectId);
      return {
        toolName: this.name,
        success: true,
        data: { topIssues },
        explanation: "Retrieved top issues.",
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
