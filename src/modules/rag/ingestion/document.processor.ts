import {
  Chunker,
  DocumentChunk,
  DocumentType,
  RagDocument,
} from "../rag.types";

import { SemanticChunker } from "./chunker";

export class DocumentProcessor {
  private readonly chunker: Chunker;

  constructor(chunker?: Chunker) {
    this.chunker = chunker ?? new SemanticChunker();
  }

  /**
   * ============================================================
   * Main Entry
   * ============================================================
   */
  async process(
    document: RagDocument,
  ): Promise<DocumentChunk[]> {
    const normalized = this.normalize(document);

    return this.chunker.chunk(normalized);
  }

  /**
   * ============================================================
   * Normalize Document
   * ============================================================
   */
  private normalize(document: RagDocument): RagDocument {
    let content = document.content;

    content = this.removeExtraWhitespace(content);

    switch (document.type) {
      case DocumentType.LOG:
        content = this.normalizeLogs(content);
        break;

      case DocumentType.DOCUMENTATION:
        content = this.normalizeMarkdown(content);
        break;

      case DocumentType.RUNBOOK:
        content = this.normalizeMarkdown(content);
        break;

      case DocumentType.API:
        content = this.normalizeMarkdown(content);
        break;

      case DocumentType.INCIDENT:
        content = this.normalizeIncident(content);
        break;

      case DocumentType.CHANGELOG:
        content = this.normalizeMarkdown(content);
        break;

      default:
        break;
    }

    return {
      ...document,
      content,
    };
  }

  /**
   * ============================================================
   * Markdown
   * ============================================================
   */
  private normalizeMarkdown(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * ============================================================
   * Logs
   * ============================================================
   */
  private normalizeLogs(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  /**
   * ============================================================
   * Incident
   * ============================================================
   */
  private normalizeIncident(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, "\n\n")
      .trim();
  }

  /**
   * ============================================================
   * Remove Extra Spaces
   * ============================================================
   */
  private removeExtraWhitespace(text: string): string {
    return text
      .replace(/[ \t]+/g, " ")
      .trim();
  }
}