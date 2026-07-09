import { AgentTool, ToolResult } from "../interfaces";
import { ExtractedEntities, Intent } from "../../classifier/intent.types";
import { ollamaClient } from "../../ollama.client";
import { db } from "../../../../config/db";

/**
 * DocumentationTool — Real RAG implementation.
 *
 * 1. Embeds the user's question via Ollama (nomic-embed-text, 768-dim).
 * 2. Runs a pgvector cosine-similarity search against the `knowledge_documents` table.
 * 3. Returns the top-K chunks as grounded context for the Summarizer.
 *
 * The `knowledge_documents` table must have an `embedding vector(768)` column
 * and be populated via the /knowledge ingest endpoint.
 */
export class DocumentationTool implements AgentTool {
  name = "DocumentationTool";
  description =
    "Searches LogSense developer documentation using RAG (pgvector semantic search).";
  intents: Intent[] = ["DOCUMENTATION"];

  private readonly FALLBACK_DOCS = `
LogSense SDK Quick Reference:
- Install: npm install @utkarshpayal/logsense-sdk
- Init: logsense.init({ apiKey: 'ls_...', projectId: '...', service: 'my-service' })
- Log: logsense.log({ level: 'info', message: 'User signed in', metadata: { userId } })
- The SDK batches logs and sends them to the LogSense ingestion endpoint.
- Environment variables: LOGSENSE_API_KEY, LOGSENSE_PROJECT_ID
- Supported log levels: debug, info, warn, error
`.trim();

  async execute(
    projectId: string,
    entities: ExtractedEntities,
    originalPrompt?: string
  ): Promise<ToolResult> {
    const query = originalPrompt ?? entities.searchTerm ?? "";

    if (!query) {
      return this.fallback("No query provided.");
    }

    try {
      // 1. Embed the query
      const embedding = await ollamaClient.generateEmbedding(query);
      const embeddingStr = JSON.stringify(embedding);

      // 2. Semantic search in knowledge_documents
      const result = await db.query(
        `
        SELECT
          title,
          content,
          type,
          metadata,
          1 - (embedding <=> $1::vector) AS similarity
        FROM knowledge_documents
        WHERE project_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3;
        `,
        [embeddingStr, projectId, entities.limit ?? 5]
      );

      if (result.rows.length === 0) {
        console.log(
          "[DocumentationTool] No knowledge chunks found in DB — serving built-in fallback docs."
        );
        return {
          toolName: this.name,
          success: true,
          data: { documentationContext: this.FALLBACK_DOCS },
          explanation:
            "No project-specific documentation found. Returning built-in LogSense SDK reference.",
        };
      }

      // 3. Assemble context string from top-K chunks
      const context = result.rows
        .map(
          (row: any, i: number) =>
            `[Doc ${i + 1}] ${row.title} (similarity: ${Number(row.similarity).toFixed(3)})\n${row.content}`
        )
        .join("\n\n---\n\n");

      console.log(
        `[DocumentationTool] Retrieved ${result.rows.length} documentation chunks via RAG.`
      );

      return {
        toolName: this.name,
        success: true,
        data: { documentationContext: context, chunks: result.rows },
        explanation: `Retrieved ${result.rows.length} relevant documentation chunks using semantic search.`,
      };
    } catch (e: any) {
      console.error("[DocumentationTool] RAG error:", e.message);
      // Graceful fallback — never hard-fail on doc queries
      return this.fallback(e.message);
    }
  }

  private fallback(reason: string): ToolResult {
    return {
      toolName: this.name,
      success: true,
      data: { documentationContext: this.FALLBACK_DOCS },
      explanation: `Returning built-in documentation (RAG unavailable: ${reason}).`,
    };
  }
}
