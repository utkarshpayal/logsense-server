"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const project_service_1 = require("./project.service");
class ProjectController {
    async createProject(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const ownerId = request.user.sub;
            const project = await project_service_1.projectService.createProject({
                ownerId,
                ...request.body,
            });
            return reply.code(201).send({
                success: true,
                message: "Project created successfully",
                data: project,
            });
        }
        catch (error) {
            if (error.message === "Project with this name already exists" ||
                error.code === "23505") {
                return reply.conflict("Project with this name already exists");
            }
            return reply.internalServerError(error.message || "Failed to create project");
        }
    }
    async getProjects(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const ownerId = request.user.sub;
            const projects = await project_service_1.projectService.getProjects(ownerId);
            return reply.send({
                success: true,
                data: projects,
            });
        }
        catch (error) {
            return reply.internalServerError(error.message || "Failed to fetch projects");
        }
    }
    async getProject(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const project = await project_service_1.projectService.getProject(request.params.id);
            return reply.send({
                success: true,
                data: project,
            });
        }
        catch (error) {
            if (error.message === "Project not found") {
                return reply.notFound("Project not found");
            }
            return reply.internalServerError(error.message || "Failed to fetch project");
        }
    }
    async updateProject(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const project = await project_service_1.projectService.updateProject(request.params.id, request.body);
            return reply.send({
                success: true,
                message: "Project updated successfully",
                data: project,
            });
        }
        catch (error) {
            if (error.message === "Project not found") {
                return reply.notFound("Project not found");
            }
            if (error.code === "23505" || error.message.includes("already exists")) {
                return reply.conflict("Project with this name already exists");
            }
            return reply.internalServerError(error.message || "Failed to update project");
        }
    }
    async deleteProject(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            await project_service_1.projectService.deleteProject(request.params.id);
            return reply.send({
                success: true,
                message: "Project deleted successfully",
            });
        }
        catch (error) {
            if (error.message === "Project not found") {
                return reply.notFound("Project not found");
            }
            return reply.internalServerError(error.message || "Failed to delete project");
        }
    }
}
exports.projectController = new ProjectController();
