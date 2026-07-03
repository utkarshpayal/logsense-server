import { ExtractedEntities } from "../classifier/intent.types";

export interface ToolResult {
  /** Deterministic SQL that was executed */
  sql: string;
  /** Human-readable explanation of what the SQL does */
  explanation: string;
  /** Raw database rows */
  rows: any[];
}

/**
 * Every AI Tool must implement this interface.
 * Tools are pure data-fetchers — no LLM calls inside.
 */
export interface BaseTool {
  execute(projectId: string, entities: ExtractedEntities): Promise<ToolResult>;
}
