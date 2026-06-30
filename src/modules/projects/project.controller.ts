import { FastifyReply } from "fastify";
import { TypedRequest, TypedReply } from "../../types/fastify";

import { projectService } from "./project.service";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectParamsDto,
} from "./project.schema";

class ProjectController {
  async createProject(
    request: TypedRequest<{
      Body: CreateProjectDto;
    }>,
    reply: TypedReply<{
      Body: CreateProjectDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const ownerId = request.user.sub;

      const project = await projectService.createProject({
        ownerId,
        ...request.body,
      });

      return reply.code(201).send({
        success: true,
        message: "Project created successfully",
        data: project,
      });
    } catch (error: any) {
      if (
        error.message === "Project with this name already exists" ||
        error.code === "23505"
      ) {
        return reply.conflict("Project with this name already exists");
      }
      return reply.internalServerError(error.message || "Failed to create project");
    }
  }

  async getProjects(
    request: TypedRequest,
    reply: TypedReply
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const ownerId = request.user.sub;
      const projects = await projectService.getProjects(ownerId);

      return reply.send({
        success: true,
        data: projects,
      });
    } catch (error: any) {
      return reply.internalServerError(error.message || "Failed to fetch projects");
    }
  }

  async getProject(
    request: TypedRequest<{
      Params: ProjectParamsDto;
    }>,
    reply: TypedReply<{
      Params: ProjectParamsDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const project = await projectService.getProject(
        request.params.id
      );

      return reply.send({
        success: true,
        data: project,
      });
    } catch (error: any) {
      if (error.message === "Project not found") {
        return reply.notFound("Project not found");
      }
      return reply.internalServerError(error.message || "Failed to fetch project");
    }
  }

  async updateProject(
    request: TypedRequest<{
      Params: ProjectParamsDto;
      Body: UpdateProjectDto;
    }>,
    reply: TypedReply<{
      Params: ProjectParamsDto;
      Body: UpdateProjectDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const project = await projectService.updateProject(
        request.params.id,
        request.body
      );

      return reply.send({
        success: true,
        message: "Project updated successfully",
        data: project,
      });
    } catch (error: any) {
      if (error.message === "Project not found") {
        return reply.notFound("Project not found");
      }
      if (error.code === "23505" || error.message.includes("already exists")) {
        return reply.conflict("Project with this name already exists");
      }
      return reply.internalServerError(error.message || "Failed to update project");
    }
  }

  async deleteProject(
    request: TypedRequest<{
      Params: ProjectParamsDto;
    }>,
    reply: TypedReply<{
      Params: ProjectParamsDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      await projectService.deleteProject(request.params.id);

      return reply.send({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error: any) {
      if (error.message === "Project not found") {
        return reply.notFound("Project not found");
      }
      return reply.internalServerError(error.message || "Failed to delete project");
    }
  }
}

export const projectController = new ProjectController();