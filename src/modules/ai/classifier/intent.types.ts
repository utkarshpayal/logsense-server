export type Intent =
  | "BUSINESS"
  | "LOGS"
  | "METRICS"
  | "DASHBOARD"
  | "TRACE"
  | "ISSUE"
  | "USER"
  | "PROJECT"
  | "API_KEY"
  | "DOCUMENTATION"
  | "GENERAL_KNOWLEDGE"
  | "SEMANTIC_SEARCH"
  | "UNKNOWN";

export interface ExtractedEntities {
  userId?: string;
  userName?: string;
  userEmail?: string;
  service?: string;
  traceId?: string;
  requestId?: string;
  level?: string;
  /** Postgres interval string — e.g. "1 day", "1 hour", "7 days" */
  timeRange?: string;
  statusCode?: number;
  endpoint?: string;
  /** Latency threshold in milliseconds */
  threshold?: number;
  searchTerm?: string;
  environment?: string;
  limit?: number;
}

export interface ClassificationResult {
  intents: Intent[];
  /** 0.0 – 1.0  */
  confidence: number;
  extractedEntities: ExtractedEntities;
}
