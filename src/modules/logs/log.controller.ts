import { TypedRequest, TypedReply } from "../../types/fastify";
import { logService } from "./log.service";
import {
  CreateLogDto,
  GetLogsQueryDto,
  LogParamsDto,
  DashboardQueryDto,
} from "./log.schema";
import { UnauthorizedError } from "../../common/errors/unauthorized.error";

function mapSdkEventToLogData(event: any, defaultProjectId: string, defaultEnv: string | null): any {
  let level = event.severity || event.level || "info";
  level = level.toLowerCase();
  if (!["trace", "debug", "info", "warn", "error", "fatal"].includes(level)) {
    level = "info";
  }

  const tenant = event.tenant || {};
  const projectId = tenant.projectId || defaultProjectId;
  const environment = tenant.environment || event.environment || defaultEnv;
  const service = tenant.service || event.service;

  let message = event.message;
  if (!message) {
    message = event.type || event.category || "No message";
  }

  const relationships = event.relationships || {};
  const traceId = relationships.traceId || event.traceId;
  const requestId = relationships.requestId || event.requestId;

  const runtime = event.runtime || {};
  const hostname = runtime.hostname || event.hostname;

  const createdAt = event.timestamp ? new Date(event.timestamp) : new Date();

  const metadata: Record<string, any> = {
    ...(event.metadata || {}),
  };

  if (event.category) metadata.category = event.category;
  if (event.type) metadata.type = event.type;
  if (event.action) metadata.action = event.action;
  if (event.version) metadata.version = event.version;
  if (event.duration !== undefined) metadata.duration = event.duration;
  if (event.actor) metadata.actor = event.actor;
  if (event.resource) metadata.resource = event.resource;
  if (event.runtime) metadata.runtime = event.runtime;
  if (event.tags) metadata.tags = event.tags;

  if (event.http) metadata.http = event.http;
  if (event.database) metadata.database = event.database;
  if (event.cache) metadata.cache = event.cache;
  if (event.queue) metadata.queue = event.queue;
  if (event.external) metadata.external = event.external;
  if (event.exception) metadata.exception = event.exception;
  if (event.runtimeMetrics) metadata.runtimeMetrics = event.runtimeMetrics;

  return {
    projectId,
    level,
    message,
    service,
    environment,
    traceId,
    requestId,
    hostname,
    createdAt,
    metadata,
  };
}

class LogController {
  async createLog(
    request: TypedRequest<{
      Body: any;
    }>,
    reply: TypedReply<{
      Body: any;
    }>
  ) {
    if (!request.apiKey) {
      throw new UnauthorizedError("Authentication via API Key is required");
    }

    const { project_id: projectId, id: apiKeyId, environment: keyEnv } = request.apiKey;

    const body = request.body as any;
    let eventsToIngest: any[] = [];

    if (body && typeof body === "object") {
      if (Array.isArray(body)) {
        eventsToIngest = body;
      } else if (Array.isArray(body.events)) {
        eventsToIngest = body.events;
      } else if (body.event && typeof body.event === "object") {
        eventsToIngest = [body.event];
      } else {
        eventsToIngest = [body];
      }
    }

    if (eventsToIngest.length === 0) {
      return reply.code(400).send({
        success: false,
        message: "No logs or events found to ingest",
      });
    }

    const mappedLogs = eventsToIngest.map((evt) =>
      mapSdkEventToLogData(evt, projectId, keyEnv)
    );

    const logs = await logService.createLogs(projectId, apiKeyId, mappedLogs);

    return reply.code(201).send({
      success: true,
      message: `${logs.length} log(s) ingested successfully`,
      data: logs.length === 1 ? logs[0] : logs,
    });
  }

  async getLogs(
    request: TypedRequest<{
      Querystring: GetLogsQueryDto;
    }>,
    reply: TypedReply<{
      Querystring: GetLogsQueryDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const result = await logService.getLogs(request.user.sub, request.query);

    return reply.send({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: request.query.limit || 50,
        offset: request.query.offset || 0,
      },
    });
  }

  async getLog(
    request: TypedRequest<{
      Params: LogParamsDto;
    }>,
    reply: TypedReply<{
      Params: LogParamsDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const { id } = request.params;
    const log = await logService.getLog(request.user.sub, id);

    return reply.send({
      success: true,
      data: log,
    });
  }

  async deleteLog(
    request: TypedRequest<{
      Params: LogParamsDto;
    }>,
    reply: TypedReply<{
      Params: LogParamsDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const { id } = request.params;
    await logService.deleteLog(request.user.sub, id);

    return reply.send({
      success: true,
      message: "Log deleted successfully",
    });
  }

  // Dashboard handlers
  async getDashboardOverview(
    request: TypedRequest<{
      Querystring: DashboardQueryDto;
    }>,
    reply: TypedReply<{
      Querystring: DashboardQueryDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const data = await logService.getDashboardOverview(request.user.sub, request.query.projectId);

    return reply.send({
      success: true,
      data,
    });
  }

  async getDashboardTimeline(
    request: TypedRequest<{
      Querystring: DashboardQueryDto;
    }>,
    reply: TypedReply<{
      Querystring: DashboardQueryDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const data = await logService.getDashboardTimeline(request.user.sub, request.query.projectId);

    return reply.send({
      success: true,
      data,
    });
  }

  async getDashboardLogLevels(
    request: TypedRequest<{
      Querystring: DashboardQueryDto;
    }>,
    reply: TypedReply<{
      Querystring: DashboardQueryDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const data = await logService.getDashboardLogLevels(request.user.sub, request.query.projectId);

    return reply.send({
      success: true,
      data,
    });
  }

  async getDashboardServices(
    request: TypedRequest<{
      Querystring: DashboardQueryDto;
    }>,
    reply: TypedReply<{
      Querystring: DashboardQueryDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const data = await logService.getDashboardServices(request.user.sub, request.query.projectId);

    return reply.send({
      success: true,
      data,
    });
  }

  async getDashboardRecentErrors(
    request: TypedRequest<{
      Querystring: DashboardQueryDto;
    }>,
    reply: TypedReply<{
      Querystring: DashboardQueryDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const data = await logService.getDashboardRecentErrors(request.user.sub, request.query.projectId);

    return reply.send({
      success: true,
      data,
    });
  }
}

export const logController = new LogController();
