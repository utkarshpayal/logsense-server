import { ExtractedEntities } from "./intent.types";

export class EntityExtractor {
  /**
   * Safely parses and normalizes entities returned by the LLM.
   */
  extract(parsedJson: any): ExtractedEntities {
    const raw = parsedJson?.extractedEntities || {};
    
    const entities: ExtractedEntities = {};

    if (typeof raw.userId === "string") entities.userId = raw.userId;
    if (typeof raw.userName === "string") entities.userName = raw.userName;
    if (typeof raw.userEmail === "string") entities.userEmail = raw.userEmail;
    if (typeof raw.service === "string") entities.service = raw.service;
    if (typeof raw.traceId === "string") entities.traceId = raw.traceId;
    if (typeof raw.requestId === "string") entities.requestId = raw.requestId;
    if (typeof raw.level === "string") entities.level = raw.level.toLowerCase();
    if (typeof raw.timeRange === "string") entities.timeRange = raw.timeRange;
    if (typeof raw.statusCode === "number") entities.statusCode = raw.statusCode;
    if (typeof raw.endpoint === "string") entities.endpoint = raw.endpoint;
    if (typeof raw.threshold === "number") entities.threshold = raw.threshold;
    if (typeof raw.searchTerm === "string") entities.searchTerm = raw.searchTerm;
    if (typeof raw.environment === "string") entities.environment = raw.environment;
    
    // Default limit if not specified but needed
    entities.limit = typeof raw.limit === "number" ? raw.limit : 50;

    return entities;
  }
}

export const entityExtractor = new EntityExtractor();
