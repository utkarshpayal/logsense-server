"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = projectRoutes;
const project_controller_1 = require("./project.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const project_schema_1 = require("./project.schema");
async function projectRoutes(app) {
    const typedApp = app.withTypeProvider();
    typedApp.post("/", {
        schema: {
            body: project_schema_1.createProjectSchema,
        },
        preHandler: [auth_middleware_1.authenticate],
    }, project_controller_1.projectController.createProject);
    typedApp.get("/", {
        preHandler: [auth_middleware_1.authenticate]
    }, project_controller_1.projectController.getProjects);
    typedApp.get("/:id", {
        schema: {
            params: project_schema_1.projectParamsSchema,
        },
        preHandler: [auth_middleware_1.authenticate],
    }, project_controller_1.projectController.getProject);
    typedApp.put("/:id", {
        schema: {
            params: project_schema_1.projectParamsSchema,
            body: project_schema_1.updateProjectSchema,
        },
        preHandler: [auth_middleware_1.authenticate],
    }, project_controller_1.projectController.updateProject);
    typedApp.delete("/:id", {
        schema: {
            params: project_schema_1.projectParamsSchema,
        },
        preHandler: [auth_middleware_1.authenticate],
    }, project_controller_1.projectController.deleteProject);
    typedApp.post("/:id/daily-report", {
        schema: {
            params: project_schema_1.projectParamsSchema,
        },
        preHandler: [auth_middleware_1.authenticate],
    }, project_controller_1.projectController.triggerDailyReport);
}
