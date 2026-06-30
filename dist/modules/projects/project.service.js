"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const project_repository_1 = require("./project.repository");
const conflict_error_1 = require("../../common/errors/conflict.error");
const not_found_error_1 = require("../../common/errors/not-found.error");
class ProjectService {
    async createProject(data) {
        const slug = this.generateSlug(data.name);
        const existingProject = await project_repository_1.projectRepository.findBySlug(slug);
        if (existingProject) {
            throw new conflict_error_1.ConflictError("Project with this name already exists");
        }
        const project = await project_repository_1.projectRepository.create({
            ownerId: data.ownerId,
            name: data.name,
            slug,
            description: data.description,
        });
        return project;
    }
    async getProjects(ownerId) {
        return project_repository_1.projectRepository.findByOwner(ownerId);
    }
    async getProject(id) {
        const project = await project_repository_1.projectRepository.findById(id);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        return project;
    }
    async updateProject(id, data) {
        const project = await project_repository_1.projectRepository.findById(id);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        return project_repository_1.projectRepository.update(id, data);
    }
    async deleteProject(id) {
        const project = await project_repository_1.projectRepository.findById(id);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        await project_repository_1.projectRepository.softDelete(id);
    }
    generateSlug(name) {
        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
    }
}
exports.projectService = new ProjectService();
