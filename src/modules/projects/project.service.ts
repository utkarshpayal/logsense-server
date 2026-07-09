import { projectRepository } from "./project.repository";
import {
    CreateProjectDto,
    UpdateProjectDto,
} from "./project.schema";
import { ConflictError } from "../../common/errors/conflict.error";
import { NotFoundError } from "../../common/errors/not-found.error";

class ProjectService {
    async createProject(
        data: CreateProjectDto & {
            ownerId: string;
        }
    ) {
        const slug = this.generateSlug(data.name);

        const existingProject = await projectRepository.findBySlug(slug);

        if (existingProject) {
            throw new ConflictError("Project with this name already exists");
        }

        const project = await projectRepository.create({
            ownerId: data.ownerId,
            name: data.name,
            slug,
            description: data.description,
            discordWebhookUrl: data.discord_webhook_url || null,
            slackWebhookUrl: data.slack_webhook_url || null,
        });

        return project;
    }

    async getProjects(ownerId: string) {
        return projectRepository.findByOwner(ownerId);
    }

    async getProject(id: string) {
        const project = await projectRepository.findById(id);

        if (!project) {
            throw new NotFoundError("Project not found");
        }

        return project;
    }

    async updateProject(
        id: string,
        data: UpdateProjectDto
    ) {
        const project = await projectRepository.findById(id);

        if (!project) {
            throw new NotFoundError("Project not found");
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.discord_webhook_url !== undefined) updateData.discordWebhookUrl = data.discord_webhook_url;
        if (data.slack_webhook_url !== undefined) updateData.slackWebhookUrl = data.slack_webhook_url;

        return projectRepository.update(id, updateData);
    }

    async deleteProject(id: string) {
        const project = await projectRepository.findById(id);

        if (!project) {
            throw new NotFoundError("Project not found");
        }

        await projectRepository.softDelete(id);
    }

    private generateSlug(name: string) {
        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
    }
}

export const projectService = new ProjectService();