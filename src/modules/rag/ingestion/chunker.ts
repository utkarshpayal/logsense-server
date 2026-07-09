import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
} from "../rag.constants";

import {
  Chunker,
  DocumentChunk,
  RagDocument,
} from "../rag.types";

import { randomUUID } from "crypto";

export class SemanticChunker implements Chunker {
  constructor(
    private readonly chunkSize = DEFAULT_CHUNK_SIZE,
    private readonly overlap = DEFAULT_CHUNK_OVERLAP,
  ) {}

  async chunk(document: RagDocument): Promise<DocumentChunk[]> {
    const content = document.content.trim();

    if (!content) {
      return [];
    }

    const sections = this.splitIntoSections(content);

    const chunks: DocumentChunk[] = [];

    let index = 0;

    for (const section of sections) {
      const sectionChunks = this.chunkSection(section);

      for (const content of sectionChunks) {
        chunks.push({
          id: randomUUID(),
          documentId: document.id,
          chunkIndex: index++,
          title: document.title,
          type: document.type,
          content,
          metadata: {
            ...document.metadata,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * ----------------------------------------
   * Split by semantic boundaries.
   * ----------------------------------------
   */
  private splitIntoSections(content: string): string[] {
    return content
      .split(/\n(?=# )|\n(?=## )|\n(?=### )/)
      .map((section) => section.trim())
      .filter(Boolean);
  }

  /**
   * ----------------------------------------
   * Chunk one section.
   * ----------------------------------------
   */
  private chunkSection(section: string): string[] {
    if (section.length <= this.chunkSize) {
      return [section];
    }

    const chunks: string[] = [];

    let start = 0;

    while (start < section.length) {
      const end = Math.min(
        start + this.chunkSize,
        section.length,
      );

      let chunk = section.substring(start, end);

      if (
        chunk.length < MIN_CHUNK_SIZE &&
        chunks.length > 0
      ) {
        chunks[chunks.length - 1] += chunk;
        break;
      }

      if (chunk.length > MAX_CHUNK_SIZE) {
        chunk = chunk.substring(0, MAX_CHUNK_SIZE);
      }

      chunks.push(chunk);

      start += this.chunkSize - this.overlap;
    }

    return chunks;
  }
}