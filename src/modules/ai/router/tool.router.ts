import { Intent } from "../classifier/intent.types";
import { BaseTool } from "../tools/base.tool";
import { SlowServicesTool } from "../tools/slow-services.tool";
import { SlowEndpointsTool } from "../tools/slow-endpoints.tool";
import { TopErrorsTool } from "../tools/top-errors.tool";
import { LatestErrorsTool } from "../tools/latest-errors.tool";
import { LatestWarningsTool } from "../tools/latest-warnings.tool";
import { ErrorCountTool } from "../tools/error-count.tool";
import { RequestCountTool } from "../tools/request-count.tool";
import { HttpStatusTool } from "../tools/http-status.tool";
import { TopEndpointsTool } from "../tools/top-endpoints.tool";
import { TopUsersTool } from "../tools/top-users.tool";
import { TopApiKeysTool } from "../tools/top-api-keys.tool";
import { ServiceHealthTool } from "../tools/service-health.tool";
import { RequestTimelineTool } from "../tools/request-timeline.tool";
import { TraceLookupTool } from "../tools/trace-lookup.tool";
import { RequestLookupTool } from "../tools/request-lookup.tool";
import { UserActivityTool } from "../tools/user-activity.tool";
import { DatabaseQueriesTool } from "../tools/database-queries.tool";
import { LogSearchTool } from "../tools/log-search.tool";
import { ProjectInfoTool } from "../tools/project-info.tool";
import { ApiKeyInfoTool } from "../tools/api-key-info.tool";
import { MostActiveServiceTool } from "../tools/most-active-service.tool";
import { MostActiveHostTool } from "../tools/most-active-host.tool";
import { LatencyTool } from "../tools/latency.tool";

// FALLBACK = intent needs dynamic SQL generation
export const FALLBACK = "FALLBACK" as const;

type RouteTarget = BaseTool | typeof FALLBACK;

const INTENT_MAP: Record<Intent, RouteTarget> = {
  SLOW_SERVICES:       new SlowServicesTool(),
  SLOW_ENDPOINTS:      new SlowEndpointsTool(),
  TOP_ERRORS:          new TopErrorsTool(),
  LATEST_ERRORS:       new LatestErrorsTool(),
  LATEST_WARNINGS:     new LatestWarningsTool(),
  ERROR_COUNT:         new ErrorCountTool(),
  REQUEST_COUNT:       new RequestCountTool(),
  HTTP_STATUS:         new HttpStatusTool(),
  TOP_ENDPOINTS:       new TopEndpointsTool(),
  TOP_USERS:           new TopUsersTool(),
  TOP_API_KEYS:        new TopApiKeysTool(),
  SERVICE_HEALTH:      new ServiceHealthTool(),
  REQUEST_TIMELINE:    new RequestTimelineTool(),
  TRACE_LOOKUP:        new TraceLookupTool(),
  REQUEST_LOOKUP:      new RequestLookupTool(),
  USER_ACTIVITY:       new UserActivityTool(),
  DATABASE_QUERIES:    new DatabaseQueriesTool(),
  LOG_SEARCH:          new LogSearchTool(),
  PROJECT_INFO:        new ProjectInfoTool(),
  API_KEY_INFO:        new ApiKeyInfoTool(),
  MOST_ACTIVE_SERVICE: new MostActiveServiceTool(),
  MOST_ACTIVE_HOST:    new MostActiveHostTool(),
  LATENCY:             new LatencyTool(),
  // Stub intents — fall back to keyword search until SDK emits these events
  REDIS_OPERATIONS:    new LogSearchTool(),
  DEPLOYMENT_ISSUES:   new LogSearchTool(),
  // Always use dynamic SQL fallback
  GENERAL_SQL:         FALLBACK,
  UNKNOWN:             FALLBACK,
};

/** Minimum confidence to trust a classified intent and skip the SQL fallback */
const MIN_CONFIDENCE = 0.75;

export class AiToolRouter {
  /**
   * Returns the tool for this intent, or FALLBACK if confidence is too low
   * or the intent is GENERAL_SQL / UNKNOWN.
   */
  route(intent: Intent, confidence: number): RouteTarget {
    if (confidence < MIN_CONFIDENCE) {
      console.log(`🔀 [Router] confidence ${confidence} < ${MIN_CONFIDENCE} — routing to FALLBACK`);
      return FALLBACK;
    }
    const target = INTENT_MAP[intent] ?? FALLBACK;
    const name = target === FALLBACK ? "FALLBACK" : target.constructor.name;
    console.log(`🔀 [Router] ${intent} → ${name}`);
    return target;
  }
}

export const aiToolRouter = new AiToolRouter();
