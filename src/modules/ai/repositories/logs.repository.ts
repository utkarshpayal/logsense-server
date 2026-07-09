import { db } from "../../../config/db";
import { ExtractedEntities } from "../classifier/intent.types";

export function mapTimeRangeToDate(timeRange?: string): Date | null {
  if (!timeRange) return null;
  const now = new Date();
  const range = timeRange.toLowerCase();
  
  if (range.includes("today")) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday;
  }
  if (range.includes("yesterday")) {
    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    return startOfYesterday;
  }
  if (range.includes("hour") || range.endsWith("h")) {
    const hours = parseInt(range) || 1;
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }
  if (range.includes("day") || range.endsWith("d")) {
    const days = parseInt(range) || 1;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  return null;
}

function applyEntityFilters(conditions: string[], params: any[], entities: ExtractedEntities) {
  if (entities.level) {
    params.push(entities.level);
    conditions.push(`level ILIKE $${params.length}`);
  }
  if (entities.service) {
    params.push(entities.service);
    conditions.push(`service ILIKE $${params.length}`);
  }
  if (entities.environment) {
    params.push(entities.environment);
    conditions.push(`environment ILIKE $${params.length}`);
  }
  if (entities.statusCode) {
    params.push(entities.statusCode.toString());
    conditions.push(`(metadata->'http'->>'statusCode' = $${params.length} OR metadata->>'statusCode' = $${params.length} OR metadata->'res'->>'statusCode' = $${params.length})`);
  }
  if (entities.endpoint) {
    params.push(`%${entities.endpoint}%`);
    conditions.push(`(metadata->'http'->>'url' ILIKE $${params.length} OR message ILIKE $${params.length})`);
  }
  if (entities.traceId) {
    params.push(entities.traceId);
    conditions.push(`trace_id = $${params.length}`);
  }
  if (entities.requestId) {
    params.push(entities.requestId);
    conditions.push(`(metadata->>'request_id' = $${params.length} OR metadata->>'reqId' = $${params.length} OR metadata->'req'->>'id' = $${params.length})`);
  }
  
  const timeDate = mapTimeRangeToDate(entities.timeRange);
  if (timeDate) {
    params.push(timeDate);
    conditions.push(`created_at >= $${params.length}`);
  }
}

export class LogsRepository {
  async getLatestLogs(projectId: string, entities: ExtractedEntities) {
    const limit = entities.limit || 50;
    const conditions: string[] = ["project_id = $1"];
    const params: any[] = [projectId];
    
    applyEntityFilters(conditions, params, entities);
    
    params.push(limit);
    const limitIndex = params.length;
    
    const query = `
      SELECT id, level, service, message, metadata, environment, created_at, trace_id
      FROM logs 
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC 
      LIMIT $${limitIndex}
    `;
    
    const res = await db.query(query, params);
    return res.rows;
  }

  async searchLogs(projectId: string, entities: ExtractedEntities) {
    const term = entities.searchTerm || "";
    const conditions: string[] = ["project_id = $1"];
    const params: any[] = [projectId];
    
    if (term) {
      let queryTerm = `%${term}%`;
      const lowerTerm = term.toLowerCase().replace(/[^a-z]/g, "");
      if (
        lowerTerm.includes("signup") || 
        lowerTerm.includes("signedup") || 
        (lowerTerm.includes("sign") && lowerTerm.includes("up"))
      ) {
        queryTerm = "%sign%up%";
      } else if (
        lowerTerm.includes("login") || 
        lowerTerm.includes("loggedin") || 
        (lowerTerm.includes("log") && lowerTerm.includes("in"))
      ) {
        queryTerm = "%login%";
      }
      params.push(queryTerm);
      conditions.push(`(message ILIKE $${params.length} OR metadata::text ILIKE $${params.length})`);
    }
    
    applyEntityFilters(conditions, params, entities);
    
    const limit = entities.limit || 50;
    params.push(limit);
    const limitIndex = params.length;

    const query = `
      SELECT id, level, service, message, metadata, environment, created_at, trace_id
      FROM logs 
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC 
      LIMIT $${limitIndex}
    `;
    
    const res = await db.query(query, params);
    return res.rows;
  }
}

export const logsRepository = new LogsRepository();
