import { db } from "../../config/db";
import { GetLogsQueryDto } from "./log.schema";

export interface CreateLogRepoData {
  projectId: string;
  apiKeyId: string | null;
  level: string;
  message: string;
  service?: string | undefined;
  environment?: string | undefined;
  metadata?: any | undefined;
  traceId?: string | undefined;
  requestId?: string | undefined;
  hostname?: string | undefined;
}

export interface Log {
  id: string;
  project_id: string;
  api_key_id: string | null;
  level: string;
  message: string;
  service: string | null;
  environment: string | null;
  metadata: any | null;
  trace_id: string | null;
  request_id: string | null;
  hostname: string | null;
  created_at: Date;
}

export interface OverviewData {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  projectsCount: number;
  apiKeysCount: number;
  errorRate: number;
  averageLatencyMs: number;
}

export interface TimelineData {
  time_bucket: string;
  total_count: number;
  error_count: number;
}

export interface LogLevelCountItem {
  level: string;
  count: number;
}

export interface ServiceCount {
  service: string | null;
  total_count: number;
  avg_latency: number;
  error_count: number;
}

class LogRepository {
  async create(data: CreateLogRepoData): Promise<Log> {
    const result = await db.query<Log>(
      `
      INSERT INTO logs
      (
        project_id,
        api_key_id,
        level,
        message,
        service,
        environment,
        metadata,
        trace_id,
        request_id,
        hostname
      )
      VALUES
      (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *;
      `,
      [
        data.projectId,
        data.apiKeyId,
        data.level,
        data.message,
        data.service || null,
        data.environment || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.traceId || null,
        data.requestId || null,
        data.hostname || null,
      ]
    );

    return result.rows[0]!;
  }

  async findById(id: string): Promise<Log | null> {
    const result = await db.query<Log>(
      `
      SELECT *
      FROM logs
      WHERE id = $1;
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async delete(id: string): Promise<void> {
    await db.query(
      `
      DELETE FROM logs
      WHERE id = $1;
      `,
      [id]
    );
  }

  async find(projectIds: string[], filters: GetLogsQueryDto): Promise<{ logs: Log[]; total: number }> {
    const conditions: string[] = ["project_id = ANY($1)"];
    const values: any[] = [projectIds];
    let paramIndex = 2;

    if (filters.level) {
      conditions.push(`level = $${paramIndex++}`);
      values.push(filters.level);
    }

    if (filters.service) {
      conditions.push(`service = $${paramIndex++}`);
      values.push(filters.service);
    }

    if (filters.environment) {
      conditions.push(`environment = $${paramIndex++}`);
      values.push(filters.environment);
    }

    if (filters.search) {
      conditions.push(
        `(message ILIKE $${paramIndex} OR trace_id ILIKE $${paramIndex} OR request_id ILIKE $${paramIndex} OR metadata::text ILIKE $${paramIndex})`
      );
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.join(" AND ");

    // Count query
    const countResult = await db.query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM logs
      WHERE ${whereClause};
      `,
      values
    );

    const total = parseInt(countResult.rows[0]!.count, 10);

    // Pagination values
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    // Sorting - sanitize to prevent injection
    const allowedSortFields = ["created_at", "level", "service", "environment"];
    const sortBy = allowedSortFields.includes(filters.sortBy || "") ? filters.sortBy : "created_at";
    const sortOrder = filters.sortOrder === "ASC" ? "ASC" : "DESC";

    const queryValues = [...values, limit, offset];
    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;

    // Data query
    const result = await db.query<Log>(
      `
      SELECT *
      FROM logs
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${limitParam} OFFSET $${offsetParam};
      `,
      queryValues
    );

    return {
      logs: result.rows,
      total,
    };
  }

  async getOverview(projectIds: string[]): Promise<OverviewData> {
    const [logsRes, errorsRes, warnsRes, keysRes, latencyRes] = await Promise.all([
      db.query<{ count: number }>("SELECT COUNT(*)::int as count FROM logs WHERE project_id = ANY($1)", [projectIds]),
      db.query<{ count: number }>("SELECT COUNT(*)::int as count FROM logs WHERE project_id = ANY($1) AND level = 'error'", [projectIds]),
      db.query<{ count: number }>("SELECT COUNT(*)::int as count FROM logs WHERE project_id = ANY($1) AND level = 'warn'", [projectIds]),
      db.query<{ count: number }>("SELECT COUNT(*)::int as count FROM api_keys WHERE project_id = ANY($1)", [projectIds]),
      db.query<{ avg_latency: number }>(
        `
        SELECT ROUND(COALESCE(AVG(COALESCE((metadata->>'latency_ms')::int, (metadata->>'latency')::int)), 0))::int as avg_latency
        FROM logs
        WHERE project_id = ANY($1) AND (metadata->>'latency_ms' IS NOT NULL OR metadata->>'latency' IS NOT NULL)
        `,
        [projectIds]
      ),
    ]);

    const totalLogs = logsRes.rows[0]?.count || 0;
    const errorCount = errorsRes.rows[0]?.count || 0;
    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

    return {
      totalLogs,
      errorCount,
      warningCount: warnsRes.rows[0]?.count || 0,
      projectsCount: projectIds.length,
      apiKeysCount: keysRes.rows[0]?.count || 0,
      errorRate,
      averageLatencyMs: latencyRes.rows[0]?.avg_latency || 0,
    };
  }

  async getTimeline(projectIds: string[]): Promise<TimelineData[]> {
    const result = await db.query<TimelineData>(
      `
      SELECT
        DATE_TRUNC('hour', created_at)::text as time_bucket,
        COUNT(*)::int as total_count,
        COUNT(CASE WHEN level = 'error' THEN 1 END)::int as error_count
      FROM logs
      WHERE project_id = ANY($1)
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY time_bucket ASC;
      `,
      [projectIds]
    );

    return result.rows;
  }

  async getLogLevelCounts(projectIds: string[]): Promise<LogLevelCountItem[]> {
    const result = await db.query<{ level: string; count: number }>(
      `
      SELECT level, COUNT(*)::int as count
      FROM logs
      WHERE project_id = ANY($1)
      GROUP BY level;
      `,
      [projectIds]
    );

    const levels = ["debug", "info", "warn", "error"];
    const countsMap = new Map<string, number>(result.rows.map((r) => [r.level, r.count]));

    return levels.map((level) => ({
      level,
      count: countsMap.get(level) || 0,
    }));
  }

  async getTopServices(projectIds: string[]): Promise<ServiceCount[]> {
    const result = await db.query<ServiceCount>(
      `
      SELECT
        service,
        COUNT(*)::int as total_count,
        ROUND(COALESCE(AVG(COALESCE((metadata->>'latency_ms')::int, (metadata->>'latency')::int)), 0))::int as avg_latency,
        COUNT(CASE WHEN level = 'error' THEN 1 END)::int as error_count
      FROM logs
      WHERE project_id = ANY($1) AND service IS NOT NULL
      GROUP BY service
      ORDER BY total_count DESC
      LIMIT 10;
      `,
      [projectIds]
    );

    return result.rows;
  }

  async getRecentErrors(projectIds: string[], limit: number): Promise<Log[]> {
    const result = await db.query<Log>(
      `
      SELECT *
      FROM logs
      WHERE project_id = ANY($1) AND level = 'error'
      ORDER BY created_at DESC
      LIMIT $2;
      `,
      [projectIds, limit]
    );

    return result.rows;
  }
}

export const logRepository = new LogRepository();
