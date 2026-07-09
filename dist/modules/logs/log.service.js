"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logService = void 0;
const log_repository_1 = require("./log.repository");
const project_repository_1 = require("../projects/project.repository");
const not_found_error_1 = require("../../common/errors/not-found.error");
const forbidden_error_1 = require("../../common/errors/forbidden.error");
class LogService {
    //create single log service
    async createLog(projectId, apiKeyId, data) {
        const project = await project_repository_1.projectRepository.findById(projectId);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        const log = await log_repository_1.logRepository.create({
            projectId,
            apiKeyId,
            ...data,
        });
        return log;
    }
    //create logs service
    async createLogs(projectId, apiKeyId, logsData) {
        const project = await project_repository_1.projectRepository.findById(projectId);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        const logsToCreate = logsData.map((log) => ({
            ...log,
            projectId,
            apiKeyId,
        }));
        const logs = await log_repository_1.logRepository.createMany(logsToCreate);
        return logs;
    }
    // Helper method to retrieve authorized project IDs for a user
    async getScopedProjectIds(userId, projectIdFilter) {
        if (projectIdFilter) {
            const project = await project_repository_1.projectRepository.findById(projectIdFilter);
            if (!project) {
                throw new not_found_error_1.NotFoundError("Project not found");
            }
            if (project.owner_id !== userId) {
                throw new forbidden_error_1.ForbiddenError("You do not have access to this project");
            }
            return [projectIdFilter];
        }
        const projects = await project_repository_1.projectRepository.findByOwner(userId);
        return projects.map((p) => p.id);
    }
    //TODO: i guess its returning all projects log count need to fix this
    async getLogs(userId, filters) {
        const projectIds = await this.getScopedProjectIds(userId, filters.projectId);
        if (projectIds.length === 0) {
            return { logs: [], total: 0 };
        }
        return log_repository_1.logRepository.find(projectIds, filters);
    }
    //get single log service
    async getLog(userId, logId) {
        const log = await log_repository_1.logRepository.findById(logId);
        if (!log) {
            throw new not_found_error_1.NotFoundError("Log not found");
        }
        const project = await project_repository_1.projectRepository.findById(log.project_id);
        if (!project || project.owner_id !== userId) {
            throw new forbidden_error_1.ForbiddenError("You do not have access to this log");
        }
        return log;
    }
    //delete log service
    async deleteLog(userId, logId) {
        const log = await log_repository_1.logRepository.findById(logId);
        if (!log) {
            throw new not_found_error_1.NotFoundError("Log not found");
        }
        const project = await project_repository_1.projectRepository.findById(log.project_id);
        if (!project || project.owner_id !== userId) {
            throw new forbidden_error_1.ForbiddenError("You do not have access to this log");
        }
        await log_repository_1.logRepository.delete(logId);
    }
    // Dashboard analytics service methods
    async getDashboardOverview(userId, projectIdFilter) {
        const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);
        if (projectIds.length === 0) {
            return {
                totalLogs: 0,
                errorCount: 0,
                warningCount: 0,
                projectsCount: 0,
                apiKeysCount: 0,
                errorRate: 0,
                averageLatencyMs: 0,
            };
        }
        return log_repository_1.logRepository.getOverview(projectIds);
    }
    //get dashboard timeline service
    async getDashboardTimeline(userId, projectIdFilter) {
        const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);
        if (projectIds.length === 0) {
            return [];
        }
        return log_repository_1.logRepository.getTimeline(projectIds);
    }
    //get dashboard log levels service
    async getDashboardLogLevels(userId, projectIdFilter) {
        const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);
        if (projectIds.length === 0) {
            return [
                { level: "debug", count: 0 },
                { level: "info", count: 0 },
                { level: "warn", count: 0 },
                { level: "error", count: 0 },
            ];
        }
        return log_repository_1.logRepository.getLogLevelCounts(projectIds);
    }
    //get dashboard services service
    async getDashboardServices(userId, projectIdFilter) {
        const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);
        if (projectIds.length === 0) {
            return [];
        }
        return log_repository_1.logRepository.getTopServices(projectIds);
    }
    //get dashboard recent errors service
    async getDashboardRecentErrors(userId, projectIdFilter) {
        const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);
        if (projectIds.length === 0) {
            return [];
        }
        return log_repository_1.logRepository.getRecentErrors(projectIds, 10);
    }
    //TODO: need to improve onboarding logic
    async getDashboardOnboarding(userId, projectIdFilter) {
        const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);
        if (projectIds.length === 0) {
            return [];
        }
        return log_repository_1.logRepository.getOnboardingLogs(projectIds);
    }
}
exports.logService = new LogService();
