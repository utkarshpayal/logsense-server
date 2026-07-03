export type Intent =
  | "SLOW_SERVICES"
  | "SLOW_ENDPOINTS"
  | "TOP_ERRORS"
  | "ERROR_COUNT"
  | "REQUEST_COUNT"
  | "TOP_ENDPOINTS"
  | "TOP_USERS"
  | "TOP_API_KEYS"
  | "LATEST_ERRORS"
  | "LATEST_WARNINGS"
  | "REQUEST_TIMELINE"
  | "SERVICE_HEALTH"
  | "DATABASE_QUERIES"
  | "REDIS_OPERATIONS"
  | "TRACE_LOOKUP"
  | "REQUEST_LOOKUP"
  | "USER_ACTIVITY"
  | "DEPLOYMENT_ISSUES"
  | "HTTP_STATUS"
  | "LATENCY"
  | "MOST_ACTIVE_SERVICE"
  | "MOST_ACTIVE_HOST"
  | "LOG_SEARCH"
  | "PROJECT_INFO"
  | "API_KEY_INFO"
  | "GENERAL_SQL"
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
  intent: Intent;
  /** 0.0 – 1.0  */
  confidence: number;
  extractedEntities: ExtractedEntities;
}
