import { db } from "../../../config/db";
import { ExtractedEntities } from "../classifier/intent.types";

export class TraceRepository {
  async getTrace(projectId: string, entities: ExtractedEntities) {
    if (!entities.traceId) return [];
    
    const query = `
      SELECT id, level, service, message, environment, created_at, metadata
      FROM logs 
      WHERE project_id = $1 AND trace_id = $2
      ORDER BY created_at ASC
    `;
    const res = await db.query(query, [projectId, entities.traceId]);
    return res.rows;
  }
}

export const traceRepository = new TraceRepository();
