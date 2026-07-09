import { Pool, PoolClient } from "pg";

import {
  EmbeddedChunk,
  SearchResult,
} from "../rag.types";

import {
  SimilaritySearchOptions,
  VectorRepository,
} from "./vector.repository";

import { VECTOR_TABLE } from "../rag.constants";

export class PgVectorRepository implements VectorRepository {
  constructor(private readonly db: Pool) {}

  async insert(chunk: EmbeddedChunk, client?: PoolClient): Promise<void> {
    const executor = client ?? this.db;
    await executor.query(
      `
      INSERT INTO ${VECTOR_TABLE}
      (
        id,
        project_id,
        document_id,
        title,
        type,
        content,
        metadata,
        embedding
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      `,
      [
        chunk.id,
        chunk.metadata.projectId,
        chunk.documentId,
        chunk.title,
        chunk.type,
        chunk.content,
        JSON.stringify(chunk.metadata),
        JSON.stringify(chunk.embedding),
      ],
    );
  }

  async insertMany(
    chunks: EmbeddedChunk[],
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      for (const chunk of chunks) {
        await this.insert(chunk, client);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDocument(
    documentId: string,
  ): Promise<void> {
    await this.db.query(
      `
      DELETE
      FROM ${VECTOR_TABLE}
      WHERE document_id=$1
      `,
      [documentId],
    );
  }

  async updateDocument(
    documentId: string,
    chunks: EmbeddedChunk[],
  ): Promise<void> {
    await this.deleteDocument(documentId);
    await this.insertMany(chunks);
  }

  async similaritySearch(
    options: SimilaritySearchOptions,
  ): Promise<SearchResult[]> {
    const {
      embedding,
      topK,
      filters,
    } = options;

    const values: any[] = [
      JSON.stringify(embedding),
      topK,
    ];

    const conditions: string[] = [];

    if (filters?.projectId) {
      values.push(filters.projectId);

      conditions.push(
        `metadata->>'projectId' = $${values.length}`,
      );
    }

    if (filters?.service) {
      values.push(filters.service);

      conditions.push(
        `metadata->>'service' = $${values.length}`,
      );
    }

    if (filters?.environment) {
      values.push(filters.environment);

      conditions.push(
        `metadata->>'environment' = $${values.length}`,
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result = await this.db.query(
      `
      SELECT
          *,
          embedding <=> $1::vector AS distance
      FROM ${VECTOR_TABLE}
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      values,
    );

    return result.rows.map((row) => ({
      id: row.id,
      score: 1 - row.distance,
      chunk: {
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        title: row.title,
        type: row.type,
        content: row.content,
        metadata: row.metadata,
      },
    }));
  }

  async findById(
    chunkId: string,
  ): Promise<EmbeddedChunk | null> {
    const result = await this.db.query(
      `
      SELECT *
      FROM ${VECTOR_TABLE}
      WHERE id=$1
      LIMIT 1
      `,
      [chunkId],
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      title: row.title ?? "",
      type: row.type ?? "text",
      content: row.content,
      metadata: row.metadata,
      embedding: row.embedding,
    };
  }

  async count(
    projectId: string,
  ): Promise<number> {
    const result = await this.db.query(
      `
      SELECT COUNT(*)::int count
      FROM ${VECTOR_TABLE}
      WHERE metadata->>'projectId'=$1
      `,
      [projectId],
    );

    return result.rows[0].count;
  }

  async clear(
    projectId: string,
  ): Promise<void> {
    await this.db.query(
      `
      DELETE
      FROM ${VECTOR_TABLE}
      WHERE metadata->>'projectId'=$1
      `,
      [projectId],
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}