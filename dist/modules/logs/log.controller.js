"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logController = void 0;
const log_service_1 = require("./log.service");
const unauthorized_error_1 = require("../../common/errors/unauthorized.error");
class LogController {
    async createLog(request, reply) {
        if (!request.apiKey) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication via API Key is required");
        }
        const { project_id: projectId, id: apiKeyId, environment: keyEnv } = request.apiKey;
        const environment = request.body.environment || keyEnv;
        const log = await log_service_1.logService.createLog(projectId, apiKeyId, {
            ...request.body,
            environment,
        });
        return reply.code(201).send({
            success: true,
            message: "Log ingested successfully",
            data: log,
        });
    }
    async getLogs(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const result = await log_service_1.logService.getLogs(request.user.sub, request.query);
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
    async getLog(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const { id } = request.params;
        const log = await log_service_1.logService.getLog(request.user.sub, id);
        return reply.send({
            success: true,
            data: log,
        });
    }
    async deleteLog(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const { id } = request.params;
        await log_service_1.logService.deleteLog(request.user.sub, id);
        return reply.send({
            success: true,
            message: "Log deleted successfully",
        });
    }
    // Dashboard handlers
    async getDashboardOverview(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const data = await log_service_1.logService.getDashboardOverview(request.user.sub, request.query.projectId);
        return reply.send({
            success: true,
            data,
        });
    }
    async getDashboardTimeline(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const data = await log_service_1.logService.getDashboardTimeline(request.user.sub, request.query.projectId);
        return reply.send({
            success: true,
            data,
        });
    }
    async getDashboardLogLevels(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const data = await log_service_1.logService.getDashboardLogLevels(request.user.sub, request.query.projectId);
        return reply.send({
            success: true,
            data,
        });
    }
    async getDashboardServices(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const data = await log_service_1.logService.getDashboardServices(request.user.sub, request.query.projectId);
        return reply.send({
            success: true,
            data,
        });
    }
    async getDashboardRecentErrors(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const data = await log_service_1.logService.getDashboardRecentErrors(request.user.sub, request.query.projectId);
        return reply.send({
            success: true,
            data,
        });
    }
}
exports.logController = new LogController();
