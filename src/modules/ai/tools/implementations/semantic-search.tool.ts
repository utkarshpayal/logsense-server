import { Intent, ExtractedEntities } from "../../classifier/intent.types";
import { AgentTool, ToolResult } from "../interfaces";
import { db } from "../../../../config/db";
import { ollamaClient } from "../../ollama.client";
import { mapTimeRangeToDate } from "../../repositories/logs.repository";

/**
 * SemanticSearchTool — pgvector cosine-similarity search on the logs table.
 *
 * Used as a fallback when deterministic tools return no results.
 * Embeds the user's original prompt via Ollama (nomic-embed-text, 768-dim)
 * and finds the most semantically similar log entries.
 */
export class SemanticSearchTool implements AgentTool {
  name = "SemanticSearch";
  description =
    "Performs a vector similarity search on logs to find relevant context when exact matches fail.";
  intents: Intent[] = ["SEMANTIC_SEARCH"];

  async execute(
    projectId: string,
    entities: ExtractedEntities,
    originalPrompt: string
  ): Promise<ToolResult> {
    try {
      console.log(
        `[SemanticSearchTool] Generating embedding for: "${originalPrompt}"`
      );

      const embedding = await ollamaClient.generateEmbedding(originalPrompt);

      const conditions: string[] = ["project_id = $2"];
      const params: any[] = [JSON.stringify(embedding), projectId];

      const timeDate = mapTimeRangeToDate(entities.timeRange);
      if (timeDate) {
        params.push(timeDate);
        conditions.push(`created_at >= $${params.length}`);
      }

      params.push(entities.limit ?? 5);
      const limitIndex = params.length;

      const result = await db.query(
        `
        SELECT
          id, level, message, service, metadata, created_at,
          1 - (embedding <=> $1::vector) AS similarity
        FROM logs
        WHERE ${conditions.join(" AND ")}
        ORDER BY embedding <=> $1::vector
        LIMIT $${limitIndex};
        `,
        params
      );

      console.log(
        `[SemanticSearchTool] Found ${result.rows.length} logs via semantic search.`
      );

      return {
        toolName: this.name,
        success: true,
        data: result.rows,
        explanation: `Found ${result.rows.length} logs using semantic similarity search.`,
      };
    } catch (e: any) {
      console.error("[SemanticSearchTool] Error:", e);
      return {
        toolName: this.name,
        success: false,
        data: [],
        explanation: "Failed to perform semantic search.",
        error: e.message,
      };
    }
  }
}
