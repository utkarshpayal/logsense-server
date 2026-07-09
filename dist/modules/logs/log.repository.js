"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRepository = void 0;
const db_1 = require("../../config/db");
const gemini_client_1 = require("../ai/gemini.client");
class LogRepository {
    async create(data) {
        const textToEmbed = `${data.level} ${data.service || ""} ${data.message} ${data.metadata ? JSON.stringify(data.metadata) : ""}`;
        //generate embedding
        const embedding = await gemini_client_1.geminiClient.generateEmbedding(textToEmbed);
        const result = await db_1.db.query(`
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
        hostname,
        created_at,
        embedding
      )
      VALUES
      (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      RETURNING *;
      `, [
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
            data.createdAt || new Date(),
            JSON.stringify(embedding)
        ]);
        return result.rows[0];
    }
    async createMany(dataList) {
        if (dataList.length === 0)
            return [];
        // Generate embeddings for all logs concurrently
        const embeddings = await Promise.all(dataList.map((data) => {
            const textToEmbed = `${data.level} ${data.service || ""} ${data.message} ${data.metadata ? JSON.stringify(data.metadata) : ""}`;
            return gemini_client_1.geminiClient.generateEmbedding(textToEmbed);
        }));
        const valueRows = [];
        const values = [];
        let paramIndex = 1;
        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            const embedding = embeddings[i];
            valueRows.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            values.push(data?.projectId, data?.apiKeyId, data?.level, data?.message, data?.service || null, data?.environment || null, data?.metadata ? JSON.stringify(data.metadata) : null, data?.traceId || null, data?.requestId || null, data?.hostname || null, data?.createdAt || new Date(), JSON.stringify(embedding));
        }
        const query = `
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
        hostname,
        created_at,
        embedding
      )
      VALUES
      ${valueRows.join(", ")}
      RETURNING *;
    `;
        const result = await db_1.db.query(query, values);
        return result.rows;
    }
    async findById(id) {
        const result = await db_1.db.query(`
      SELECT *
      FROM logs
      WHERE id = $1;
      `, [id]);
        return result.rows[0] || null;
    }
    async delete(id) {
        await db_1.db.query(`
      DELETE FROM logs
      WHERE id = $1;
      `, [id]);
    }
    async find(projectIds, filters) {
        const conditions = ["project_id = ANY($1)"];
        const values = [projectIds];
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
            conditions.push(`(message ILIKE $${paramIndex} OR trace_id ILIKE $${paramIndex} OR request_id ILIKE $${paramIndex} OR metadata::text ILIKE $${paramIndex})`);
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
        const countResult = await db_1.db.query(`
      SELECT COUNT(*) as count
      FROM logs
      WHERE ${whereClause};
      `, values);
        const total = parseInt(countResult.rows[0].count, 10);
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
        const result = await db_1.db.query(`
      SELECT *
      FROM logs
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${limitParam} OFFSET $${offsetParam};
      `, queryValues);
        return {
            logs: result.rows,
            total,
        };
    }
    async getOverview(projectIds) {
        const [logsRes, errorsRes, warnsRes, keysRes, latencyRes] = await Promise.all([
            db_1.db.query("SELECT COUNT(*)::int as count FROM logs WHERE project_id = ANY($1)", [projectIds]),
            db_1.db.query("SELECT COUNT(*)::int as count FROM logs WHERE project_id = ANY($1) AND level = 'error'", [projectIds]),
            db_1.db.query("SELECT COUNT(*)::int as count FROM logs WHERE project_id = ANY($1) AND level = 'warn'", [projectIds]),
            db_1.db.query("SELECT COUNT(*)::int as count FROM api_keys WHERE project_id = ANY($1)", [projectIds]),
            //TODO: implement properly
            db_1.db.query(`
        SELECT ROUND(COALESCE(AVG(COALESCE((metadata->>'latency_ms')::int, (metadata->>'latency')::int)), 0))::int as avg_latency
        FROM logs
        WHERE project_id = ANY($1) AND (metadata->>'latency_ms' IS NOT NULL OR metadata->>'latency' IS NOT NULL)
        `, [projectIds]),
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
    //TODO: need to improve
    async getTimeline(projectIds) {
        const result = await db_1.db.query(`
      SELECT
        DATE_TRUNC('hour', created_at)::text as time_bucket,
        COUNT(*)::int as total_count,
        COUNT(CASE WHEN level = 'error' THEN 1 END)::int as error_count
      FROM logs
      WHERE project_id = ANY($1)
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY time_bucket ASC;
      `, [projectIds]);
        return result.rows;
    }
    async getLogLevelCounts(projectIds) {
        const result = await db_1.db.query(`
      SELECT level, COUNT(*)::int as count
      FROM logs
      WHERE project_id = ANY($1)
      GROUP BY level;
      `, [projectIds]);
        const levels = ["debug", "info", "warn", "error"];
        const countsMap = new Map(result.rows.map((r) => [r.level, r.count]));
        return levels.map((level) => ({
            level,
            count: countsMap.get(level) || 0,
        }));
    }
    //TODO: need to understand
    async getTopServices(projectIds) {
        const result = await db_1.db.query(`
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
      `, [projectIds]);
        return result.rows;
    }
    async getRecentErrors(projectIds, limit) {
        const result = await db_1.db.query(`
      SELECT  id,
      project_id,
      level,
      message,
      service,
      environment,
      trace_id,
      request_id,
      hostname,
      created_at,
      metadata
      FROM logs
      WHERE project_id = ANY($1) AND level = 'error'
      ORDER BY created_at DESC
      LIMIT $2;
      `, [projectIds, limit]);
        return result.rows;
    }
    //TODO: need to improve onboarding logic
    async getOnboardingLogs(projectIds) {
        const result = await db_1.db.query(`
      SELECT id, metadata, location, created_at, updated_at
      FROM logs
      WHERE project_id = ANY($1)
        AND (metadata->'onboarding' IS NOT NULL OR metadata->>'category' = 'onboarding' OR level = 'onboarding')
      ORDER BY created_at DESC;
      `, [projectIds]);
        return result.rows;
    }
}
exports.logRepository = new LogRepository();
