import { logRepository, Log } from "./log.repository";
import { projectRepository } from "../projects/project.repository";
import { CreateLogDto, GetLogsQueryDto } from "./log.schema";
import { NotFoundError } from "../../common/errors/not-found.error";
import { ForbiddenError } from "../../common/errors/forbidden.error";

class LogService {
  async createLog(
    projectId: string,
    apiKeyId: string | null,
    data: CreateLogDto
  ): Promise<Log> {
    const project = await projectRepository.findById(projectId);

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const log = await logRepository.create({
      projectId,
      apiKeyId,
      ...data,
    });

    return log;
  }

  async createLogs(
    projectId: string,
    apiKeyId: string | null,
    logsData: any[]
  ): Promise<Log[]> {
    const project = await projectRepository.findById(projectId);

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const logsToCreate = logsData.map((log) => ({
      ...log,
      projectId,
      apiKeyId,
    }));

    const logs = await logRepository.createMany(logsToCreate);
    return logs;
  }

  // Helper method to retrieve authorized project IDs for a user
  private async getScopedProjectIds(userId: string, projectIdFilter?: string): Promise<string[]> {
    if (projectIdFilter) {
      const project = await projectRepository.findById(projectIdFilter);

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      if (project.owner_id !== userId) {
        throw new ForbiddenError("You do not have access to this project");
      }

      return [projectIdFilter];
    }

    const projects = await projectRepository.findByOwner(userId);
    return projects.map((p) => p.id);
  }

  async getLogs(userId: string, filters: GetLogsQueryDto) {
    const projectIds = await this.getScopedProjectIds(userId, filters.projectId);

    if (projectIds.length === 0) {
      return { logs: [], total: 0 };
    }

    return logRepository.find(projectIds, filters);
  }

  async getLog(userId: string, logId: string): Promise<Log> {
    const log = await logRepository.findById(logId);

    if (!log) {
      throw new NotFoundError("Log not found");
    }

    const project = await projectRepository.findById(log.project_id);
    if (!project || project.owner_id !== userId) {
      throw new ForbiddenError("You do not have access to this log");
    }

    return log;
  }

  async deleteLog(userId: string, logId: string): Promise<void> {
    const log = await logRepository.findById(logId);

    if (!log) {
      throw new NotFoundError("Log not found");
    }

    const project = await projectRepository.findById(log.project_id);
    if (!project || project.owner_id !== userId) {
      throw new ForbiddenError("You do not have access to this log");
    }

    await logRepository.delete(logId);
  }

  // Dashboard analytics service methods
  async getDashboardOverview(userId: string, projectIdFilter?: string) {
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

    return logRepository.getOverview(projectIds);
  }

  async getDashboardTimeline(userId: string, projectIdFilter?: string) {
    const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);

    if (projectIds.length === 0) {
      return [];
    }

    return logRepository.getTimeline(projectIds);
  }

  async getDashboardLogLevels(userId: string, projectIdFilter?: string) {
    const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);

    if (projectIds.length === 0) {
      return [
        { level: "debug", count: 0 },
        { level: "info", count: 0 },
        { level: "warn", count: 0 },
        { level: "error", count: 0 },
      ];
    }

    return logRepository.getLogLevelCounts(projectIds);
  }

  async getDashboardServices(userId: string, projectIdFilter?: string) {
    const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);

    if (projectIds.length === 0) {
      return [];
    }

    return logRepository.getTopServices(projectIds);
  }

  async getDashboardRecentErrors(userId: string, projectIdFilter?: string) {
    const projectIds = await this.getScopedProjectIds(userId, projectIdFilter);

    if (projectIds.length === 0) {
      return [];
    }

    return logRepository.getRecentErrors(projectIds, 10);
  }
}

export const logService = new LogService();
