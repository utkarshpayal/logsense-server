import { db } from "../../../config/db";
import { ExtractedEntities } from "../classifier/intent.types";

export class MetricsRepository {
  async getErrorRate(projectId: string) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::float / NULLIF(COUNT(*), 0) * 100 as error_rate_percent,
        COUNT(*) as total_logs
      FROM logs
      WHERE project_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
    `;
    const res = await db.query(query, [projectId]);
    return res.rows[0];
  }

  async getSlowServices(projectId: string) {
    const query = `
      SELECT service, AVG((metadata->>'latency_ms')::float) as avg_latency
      FROM logs
      WHERE project_id = $1 AND (metadata->>'latency_ms') IS NOT NULL
      GROUP BY service
      ORDER BY avg_latency DESC
      LIMIT 10
    `;
    const res = await db.query(query, [projectId]);
    return res.rows;
  }
}

export const metricsRepository = new MetricsRepository();
