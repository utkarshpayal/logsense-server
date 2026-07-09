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

  //create project route
  typedApp.post<{
    Body: CreateProjectDto;
  }>("/", {
    schema: {
      body: createProjectSchema,
    },
    preHandler: [authenticate],
  }, projectController.createProject);

  //get project route
  typedApp.get("/", {
    preHandler: [authenticate]
  }, projectController.getProjects);

  //get specific project route
  typedApp.get<{
    Params: ProjectParamsDto;
  }>("/:id", {
    schema: {
      params: projectParamsSchema,
    },
    preHandler: [authenticate],
  }, projectController.getProject);

  //update project route
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

  //delete project route
  typedApp.delete<{
    Params: ProjectParamsDto;
  }>("/:id", {
    schema: {
      params: projectParamsSchema,
    },
    preHandler: [authenticate],
  }, projectController.deleteProject);

  //daily report route
  typedApp.post<{
    Params: ProjectParamsDto;
  }>("/:id/daily-report", {
    schema: {
      params: projectParamsSchema,
    },
    preHandler: [authenticate],
  }, projectController.triggerDailyReport);
}
