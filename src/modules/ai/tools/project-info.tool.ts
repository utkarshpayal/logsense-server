import { BaseTool, ToolResult } from "./base.tool";
import { ExtractedEntities } from "../classifier/intent.types";
import { aiProjectsRepository } from "../repositories/ai-projects.repository";

export class ProjectInfoTool implements BaseTool {
  async execute(projectId: string, _entities: ExtractedEntities): Promise<ToolResult> {
    const { sql, rows } = await aiProjectsRepository.getProjectInfo(projectId);
    return { sql, rows, explanation: "Project details including owner information" };
  }
}
