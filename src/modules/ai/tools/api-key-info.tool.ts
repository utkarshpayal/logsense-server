import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiProjectsRepository } from "../repositories/ai-projects.repository";

export class ApiKeyInfoTool implements BaseTool {
  async execute(projectId: string, _entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiProjectsRepository.getApiKeyInfo(projectId);
    return { sql, rows, explanation: "All API keys for this project" };
  }
}
