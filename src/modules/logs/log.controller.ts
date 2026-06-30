import { TypedRequest, TypedReply } from "../../types/fastify";
import { logService } from "./log.service";
import {
  CreateLogDto,
  GetLogsQueryDto,
  LogParamsDto,
  DashboardQueryDto,
} from "./log.schema";
import { UnauthorizedError } from "../../common/errors/unauthorized.error";

class LogController {
  async createLog(
    request: TypedRequest<{
      Body: CreateLogDto;
    }>,
    reply: TypedReply<{
      Body: CreateLogDto;
    }>
  ) {
    if (!request.apiKey) {
      throw new UnauthorizedError("Authentication via API Key is required");
    }

    const { project_id: projectId, id: apiKeyId, environment: keyEnv } = request.apiKey;
    const environment = request.body.environment || keyEnv;

    const log = await logService.createLog(projectId, apiKeyId, {
      ...request.body,
      environment,
    });

    return reply.code(201).send({
      success: true,
      message: "Log ingested successfully",
      data: log,
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
