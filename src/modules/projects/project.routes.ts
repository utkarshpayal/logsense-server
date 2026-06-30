import { FastifyInstance } from "fastify";
import { projectController } from "./project.controller";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../common/middleware/auth.middleware";
import {
  createProjectSchema,
  updateProjectSchema,
  projectParamsSchema,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectParamsDto,
} from "./project.schema";

export async function projectRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post<{
    Body: CreateProjectDto;
  }>("/", {
    schema: {
      body: createProjectSchema,
    },
    preHandler: [authenticate],
  }, projectController.createProject);

  typedApp.get("/", {
    preHandler: [authenticate]
  }, projectController.getProjects);

  typedApp.get<{
    Params: ProjectParamsDto;
  }>("/:id", {
    schema: {
      params: projectParamsSchema,
    },
    preHandler: [authenticate],
  }, projectController.getProject);

  typedApp.put<{
    Params: ProjectParamsDto;
    Body: UpdateProjectDto;
  }>("/:id", {
    schema: {
      params: projectParamsSchema,
      body: updateProjectSchema,
    },
    preHandler: [authenticate],
  }, projectController.updateProject);

  typedApp.delete<{
    Params: ProjectParamsDto;
  }>("/:id", {
    schema: {
      params: projectParamsSchema,
    },
    preHandler: [authenticate],
  }, projectController.deleteProject);
}
