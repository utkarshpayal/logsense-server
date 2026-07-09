"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logController = void 0;
const log_service_1 = require("./log.service");
const unauthorized_error_1 = require("../../common/errors/unauthorized.error");
function mapSdkEventToLogData(event, defaultProjectId, defaultEnv) {
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
    const metadata = {
        ...(event.metadata || {}),
    };
    if (event.category)
        metadata.category = event.category;
    if (event.type)
        metadata.type = event.type;
    if (event.action)
        metadata.action = event.action;
    if (event.version)
        metadata.version = event.version;
    if (event.duration !== undefined)
        metadata.duration = event.duration;
    if (event.actor)
        metadata.actor = event.actor;
    if (event.resource)
        metadata.resource = event.resource;
    if (event.runtime)
        metadata.runtime = event.runtime;
    if (event.tags)
        metadata.tags = event.tags;
    if (event.http)
        metadata.http = event.http;
    if (event.database)
        metadata.database = event.database;
    if (event.cache)
        metadata.cache = event.cache;
    if (event.queue)
        metadata.queue = event.queue;
    if (event.external)
        metadata.external = event.external;
    if (event.exception)
        metadata.exception = event.exception;
    if (event.runtimeMetrics)
        metadata.runtimeMetrics = event.runtimeMetrics;
    if (event.onboarding)
        metadata.onboarding = event.onboarding;
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
    //create log controller
    async createLog(request, reply) {
        if (!request.apiKey) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication via API Key is required");
        }
        const { project_id: projectId, id: apiKeyId, environment: keyEnv } = request.apiKey;
        const body = request.body;
        let eventsToIngest = [];
        if (body && typeof body === "object") {
            if (Array.isArray(body)) {
                eventsToIngest = body;
            }
            else if (Array.isArray(body.events)) {
                eventsToIngest = body.events;
            }
            else if (body.event && typeof body.event === "object") {
                eventsToIngest = [body.event];
            }
            else {
                eventsToIngest = [body];
            }
        }
        if (eventsToIngest.length === 0) {
            return reply.code(400).send({
                success: false,
                message: "No logs or events found to ingest",
            });
        }
        const mappedLogs = eventsToIngest.map((evt) => mapSdkEventToLogData(evt, projectId, keyEnv));
        const logs = await log_service_1.logService.createLogs(projectId, apiKeyId, mappedLogs);
        return reply.code(201).send({
            success: true,
            message: `${logs.length} log(s) ingested successfully`,
            data: logs.length === 1 ? logs[0] : logs,
        });
    }
    //get logs controller
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
    //get specific log controller
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
    //delete specific log controller
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
    // Dashboard overview controller
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
    //dashboard timeline controller
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
    //dashboard log levels controller
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
    //dashboard services controller
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
    //dashboard recent errors
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
    //get onboarding logs TODO: need to improve
    async getDashboardOnboarding(request, reply) {
        if (!request.user || !request.user.sub) {
            throw new unauthorized_error_1.UnauthorizedError("Authentication required");
        }
        const data = await log_service_1.logService.getDashboardOnboarding(request.user.sub, request.query.projectId);
        return reply.send({
            success: true,
            data,
        });
    }
}
exports.logController = new LogController();
