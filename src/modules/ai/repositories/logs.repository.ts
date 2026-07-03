import { db } from "../../../config/db";
import { ExtractedEntities } from "../classifier/intent.types";

export class LogsRepository {
  async getLatestLogs(projectId: string, entities: ExtractedEntities) {
    const limit = entities.limit || 50;
    const level = entities.level ? `AND level ILIKE $2` : "";
    
    let query = `
      SELECT id, level, service, message, environment, created_at, trace_id
      FROM logs 
      WHERE project_id = $1 ${level}
      ORDER BY created_at DESC 
      LIMIT $${level ? '3' : '2'}
    `;
    
    const params: any[] = [projectId];
    if (entities.level) params.push(entities.level);
    params.push(limit);

    const res = await db.query(query, params);
    return res.rows;
  }

  async searchLogs(projectId: string, entities: ExtractedEntities) {
    const term = entities.searchTerm || "";
    const query = `
      SELECT id, level, service, message, environment, created_at, trace_id
      FROM logs 
      WHERE project_id = $1 
        AND (message ILIKE $2 OR metadata::text ILIKE $2)
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    const res = await db.query(query, [projectId, `%${term}%`]);
    return res.rows;
  }
}

export const logsRepository = new LogsRepository();
