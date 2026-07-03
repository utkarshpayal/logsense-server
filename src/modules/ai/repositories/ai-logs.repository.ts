import { db } from "../../../config/db";
import { SchemaRegistry } from "../schema/schema.registry";

const S = SchemaRegistry.logs;

// ── Result types ────────────────────────────────────────────────────────────

export interface LogRow {
  id: string;
  level: string;
  service: string | null;
  message: string;
  metadata: any;
  created_at: string;
  trace_id: string | null;
  request_id: string | null;
}

export interface SlowServiceRow {
  service: string;
  avg_latency_ms: number;
  max_latency_ms: number;
  request_count: number;
  error_count: number;
}

export interface SlowEndpointRow {
  endpoint: string;
  avg_latency_ms: number;
  max_latency_ms: number;
  request_count: number;
}

export interface TopEndpointRow {
  endpoint: string;
  count: number;
  error_count: number;
}

export interface TopErrorRow {
  message: string;
  service: string | null;
  count: number;
  last_seen: string;
}

export interface CountRow {
  count: number;
}

export interface StatusCodeRow {
  status_code: string;
  count: number;
}

export interface TopUserRow {
  user_id: string;
  request_count: number;
  error_count: number;
  last_seen: string;
}

export interface TopApiKeyRow {
  api_key_name: string;
  prefix: string;
  environment: string;
  request_count: number;
  error_count: number;
}

export interface ServiceHealthRow {
  service: string;
  total_count: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
}

export interface TimelineRow {
  bucket: string;
  total_count: number;
  error_count: number;
}

export interface DbQueryRow {
  db_table: string;
  db_query: string | null;
  duration_ms: number;
  level: string;
  created_at: string;
  service: string | null;
}

export interface ActiveRow {
  name: string;
  count: number;
}

export interface LatencyRow {
  avg_latency_ms: number;
  p95_approx_ms: number;
  max_latency_ms: number;
  request_count: number;
}

// ── Repository ──────────────────────────────────────────────────────────────

export class AiLogsRepository {
  /** Default time window when no timeRange is specified */
  private interval(timeRange?: string): string {
    return timeRange ?? "1 day";
  }

  // ── Slow services ─────────────────────────────────────────────────────────

  async getSlowServices(
    projectId: string,
    minLatencyMs = 500,
    timeRange?: string,
    limit = 10
  ): Promise<{ sql: string; rows: SlowServiceRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  service,
  ROUND(AVG(${S.latencyMs}))::int   AS avg_latency_ms,
  MAX(${S.latencyMs})               AS max_latency_ms,
  COUNT(*)::int                     AS request_count,
  COUNT(CASE WHEN level='error' THEN 1 END)::int AS error_count
FROM logs
WHERE project_id = $1
  AND service IS NOT NULL
  AND ${S.latencyMsText} IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY service
HAVING AVG(${S.latencyMs}) >= $2
ORDER BY avg_latency_ms DESC
LIMIT $3`;
    const res = await db.query<SlowServiceRow>(sql, [projectId, minLatencyMs, limit]);
    return { sql, rows: res.rows };
  }

  // ── Slow endpoints ────────────────────────────────────────────────────────

  async getSlowEndpoints(
    projectId: string,
    minLatencyMs = 500,
    timeRange?: string,
    limit = 10
  ): Promise<{ sql: string; rows: SlowEndpointRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ${S.url}                          AS endpoint,
  ROUND(AVG(${S.latencyMs}))::int   AS avg_latency_ms,
  MAX(${S.latencyMs})               AS max_latency_ms,
  COUNT(*)::int                     AS request_count
FROM logs
WHERE project_id = $1
  AND ${S.latencyMsText} IS NOT NULL
  AND ${S.url} IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY ${S.url}
HAVING AVG(${S.latencyMs}) >= $2
ORDER BY avg_latency_ms DESC
LIMIT $3`;
    const res = await db.query<SlowEndpointRow>(sql, [projectId, minLatencyMs, limit]);
    return { sql, rows: res.rows };
  }

  // ── Errors ────────────────────────────────────────────────────────────────

  async getTopErrors(
    projectId: string,
    timeRange?: string,
    limit = 10
  ): Promise<{ sql: string; rows: TopErrorRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  message,
  service,
  COUNT(*)::int          AS count,
  MAX(created_at)::text  AS last_seen
FROM logs
WHERE project_id = $1
  AND level = 'error'
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY message, service
ORDER BY count DESC
LIMIT $2`;
    const res = await db.query<TopErrorRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  async getLatestErrors(
    projectId: string,
    timeRange?: string,
    limit = 20
  ): Promise<{ sql: string; rows: LogRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT id, level, service, message, metadata, created_at::text, trace_id, request_id
FROM logs
WHERE project_id = $1
  AND level = 'error'
  AND created_at >= NOW() - INTERVAL '${iv}'
ORDER BY created_at DESC
LIMIT $2`;
    const res = await db.query<LogRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  async getLatestWarnings(
    projectId: string,
    timeRange?: string,
    limit = 20
  ): Promise<{ sql: string; rows: LogRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT id, level, service, message, metadata, created_at::text, trace_id, request_id
FROM logs
WHERE project_id = $1
  AND level = 'warn'
  AND created_at >= NOW() - INTERVAL '${iv}'
ORDER BY created_at DESC
LIMIT $2`;
    const res = await db.query<LogRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  async getErrorCount(
    projectId: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: CountRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT COUNT(*)::int AS count
FROM logs
WHERE project_id = $1
  AND level = 'error'
  AND created_at >= NOW() - INTERVAL '${iv}'`;
    const res = await db.query<CountRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  async getRequestCount(
    projectId: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: CountRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT COUNT(*)::int AS count
FROM logs
WHERE project_id = $1
  AND created_at >= NOW() - INTERVAL '${iv}'`;
    const res = await db.query<CountRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  // ── Endpoints ─────────────────────────────────────────────────────────────

  async getTopEndpoints(
    projectId: string,
    timeRange?: string,
    limit = 10
  ): Promise<{ sql: string; rows: TopEndpointRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ${S.url}  AS endpoint,
  COUNT(*)::int  AS count,
  COUNT(CASE WHEN level='error' THEN 1 END)::int AS error_count
FROM logs
WHERE project_id = $1
  AND ${S.url} IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY ${S.url}
ORDER BY count DESC
LIMIT $2`;
    const res = await db.query<TopEndpointRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  // ── HTTP Status ───────────────────────────────────────────────────────────

  async getStatusCodeBreakdown(
    projectId: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: StatusCodeRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ${S.statusCode}  AS status_code,
  COUNT(*)::int    AS count
FROM logs
WHERE project_id = $1
  AND ${S.statusCode} IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY ${S.statusCode}
ORDER BY count DESC`;
    const res = await db.query<StatusCodeRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async getTopUsers(
    projectId: string,
    timeRange?: string,
    limit = 10
  ): Promise<{ sql: string; rows: TopUserRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ${S.userIdAll}  AS user_id,
  COUNT(*)::int   AS request_count,
  COUNT(CASE WHEN level='error' THEN 1 END)::int AS error_count,
  MAX(created_at)::text AS last_seen
FROM logs
WHERE project_id = $1
  AND ${S.userIdAll} IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY ${S.userIdAll}
ORDER BY request_count DESC
LIMIT $2`;
    const res = await db.query<TopUserRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  async getUserActivity(
    projectId: string,
    identifier: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: LogRow[] }> {
    const iv = this.interval(timeRange);
    const esc = identifier.replace(/'/g, "''");
    const sql = `
SELECT id, level, service, message, metadata, created_at::text, trace_id, request_id
FROM logs
WHERE project_id = $1
  AND (
    ${S.userId} ILIKE '%${esc}%'
    OR ${S.userEmail} ILIKE '%${esc}%'
    OR metadata::text ILIKE '%${esc}%'
  )
  AND created_at >= NOW() - INTERVAL '${iv}'
ORDER BY created_at ASC
LIMIT 50`;
    const res = await db.query<LogRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  // ── API Keys ──────────────────────────────────────────────────────────────

  async getTopApiKeys(
    projectId: string,
    timeRange?: string,
    limit = 10
  ): Promise<{ sql: string; rows: TopApiKeyRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ak.name        AS api_key_name,
  ak.prefix,
  ak.environment,
  COUNT(l.id)::int AS request_count,
  COUNT(CASE WHEN l.level='error' THEN 1 END)::int AS error_count
FROM logs l
JOIN api_keys ak ON l.api_key_id = ak.id
WHERE l.project_id = $1
  AND l.created_at >= NOW() - INTERVAL '${iv}'
GROUP BY ak.name, ak.prefix, ak.environment
ORDER BY request_count DESC
LIMIT $2`;
    const res = await db.query<TopApiKeyRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  // ── Service health ────────────────────────────────────────────────────────

  async getServiceHealth(
    projectId: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: ServiceHealthRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  service,
  COUNT(*)::int  AS total_count,
  COUNT(CASE WHEN level='error' THEN 1 END)::int AS error_count,
  ROUND(
    COUNT(CASE WHEN level='error' THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100, 2
  )::float AS error_rate,
  ROUND(COALESCE(AVG(${S.latencyMs}), 0))::int AS avg_latency_ms
FROM logs
WHERE project_id = $1
  AND service IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY service
ORDER BY error_rate DESC, total_count DESC`;
    const res = await db.query<ServiceHealthRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  async getRequestTimeline(
    projectId: string,
    timeRange?: string,
    bucket = "hour"
  ): Promise<{ sql: string; rows: TimelineRow[] }> {
    const iv = this.interval(timeRange);
    const safeBucket = ["minute", "hour", "day"].includes(bucket) ? bucket : "hour";
    const sql = `
SELECT
  DATE_TRUNC('${safeBucket}', created_at)::text AS bucket,
  COUNT(*)::int AS total_count,
  COUNT(CASE WHEN level='error' THEN 1 END)::int AS error_count
FROM logs
WHERE project_id = $1
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY DATE_TRUNC('${safeBucket}', created_at)
ORDER BY bucket ASC`;
    const res = await db.query<TimelineRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  // ── Trace / Request ───────────────────────────────────────────────────────

  async getTrace(
    projectId: string,
    traceId: string
  ): Promise<{ sql: string; rows: LogRow[] }> {
    const sql = `
SELECT id, level, service, message, metadata, created_at::text, trace_id, request_id
FROM logs
WHERE project_id = $1
  AND trace_id = $2
ORDER BY created_at ASC
LIMIT 100`;
    const res = await db.query<LogRow>(sql, [projectId, traceId]);
    return { sql, rows: res.rows };
  }

  async getRequest(
    projectId: string,
    requestId: string
  ): Promise<{ sql: string; rows: LogRow[] }> {
    const sql = `
SELECT id, level, service, message, metadata, created_at::text, trace_id, request_id
FROM logs
WHERE project_id = $1
  AND request_id = $2
ORDER BY created_at ASC
LIMIT 50`;
    const res = await db.query<LogRow>(sql, [projectId, requestId]);
    return { sql, rows: res.rows };
  }

  // ── Database queries ──────────────────────────────────────────────────────

  async getDatabaseQueries(
    projectId: string,
    timeRange?: string,
    limit = 20
  ): Promise<{ sql: string; rows: DbQueryRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ${S.dbTable}     AS db_table,
  ${S.dbQuery}     AS db_query,
  COALESCE(${S.dbDuration}, 0) AS duration_ms,
  level,
  created_at::text,
  service
FROM logs
WHERE project_id = $1
  AND ${S.dbTable} IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
ORDER BY duration_ms DESC, created_at DESC
LIMIT $2`;
    const res = await db.query<DbQueryRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  async getSlowDatabaseQueries(
    projectId: string,
    minMs = 100,
    timeRange?: string,
    limit = 20
  ): Promise<{ sql: string; rows: DbQueryRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT
  ${S.dbTable}  AS db_table,
  ${S.dbQuery}  AS db_query,
  ${S.dbDuration} AS duration_ms,
  level,
  created_at::text,
  service
FROM logs
WHERE project_id = $1
  AND ${S.dbTable} IS NOT NULL
  AND ${S.dbDuration} >= $2
  AND created_at >= NOW() - INTERVAL '${iv}'
ORDER BY duration_ms DESC
LIMIT $3`;
    const res = await db.query<DbQueryRow>(sql, [projectId, minMs, limit]);
    return { sql, rows: res.rows };
  }

  // ── Most active ───────────────────────────────────────────────────────────

  async getMostActiveService(
    projectId: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: ActiveRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT service AS name, COUNT(*)::int AS count
FROM logs
WHERE project_id = $1
  AND service IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY service
ORDER BY count DESC
LIMIT 10`;
    const res = await db.query<ActiveRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  async getMostActiveHost(
    projectId: string,
    timeRange?: string
  ): Promise<{ sql: string; rows: ActiveRow[] }> {
    const iv = this.interval(timeRange);
    const sql = `
SELECT hostname AS name, COUNT(*)::int AS count
FROM logs
WHERE project_id = $1
  AND hostname IS NOT NULL
  AND created_at >= NOW() - INTERVAL '${iv}'
GROUP BY hostname
ORDER BY count DESC
LIMIT 10`;
    const res = await db.query<ActiveRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async searchLogs(
    projectId: string,
    term: string,
    timeRange?: string,
    limit = 30
  ): Promise<{ sql: string; rows: LogRow[] }> {
    const iv = this.interval(timeRange);
    const esc = term.replace(/'/g, "''");
    const sql = `
SELECT id, level, service, message, metadata, created_at::text, trace_id, request_id
FROM logs
WHERE project_id = $1
  AND (message ILIKE '%${esc}%' OR metadata::text ILIKE '%${esc}%')
  AND created_at >= NOW() - INTERVAL '${iv}'
ORDER BY created_at DESC
LIMIT $2`;
    const res = await db.query<LogRow>(sql, [projectId, limit]);
    return { sql, rows: res.rows };
  }

  // ── Latency ───────────────────────────────────────────────────────────────

  async getAverageLatency(
    projectId: string,
    timeRange?: string,
    service?: string
  ): Promise<{ sql: string; rows: LatencyRow[] }> {
    const iv = this.interval(timeRange);
    const serviceClause = service
      ? `AND service = '${service.replace(/'/g, "''")}'`
      : "";
    const sql = `
SELECT
  ROUND(AVG(${S.latencyMs}))::int                     AS avg_latency_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${S.latencyMs}))::int AS p95_approx_ms,
  MAX(${S.latencyMs})                                 AS max_latency_ms,
  COUNT(*)::int                                       AS request_count
FROM logs
WHERE project_id = $1
  AND ${S.latencyMsText} IS NOT NULL
  ${serviceClause}
  AND created_at >= NOW() - INTERVAL '${iv}'`;
    const res = await db.query<LatencyRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }
}

export const aiLogsRepository = new AiLogsRepository();
