import { ExtractedEntities, Intent } from "../classifier/intent.types";

export interface ToolResult {
  toolName: string;
  success: boolean;
  data: any;
  explanation?: string;
  error?: string;
}

/**
 * Every Agent Tool must implement this interface.
 * Tools are responsible for executing business logic or fetching data.
 */
export interface AgentTool {
  name: string;
  description: string;
  intents: Intent[];
  execute(projectId: string, entities: ExtractedEntities, originalPrompt?: string): Promise<ToolResult>;
}
