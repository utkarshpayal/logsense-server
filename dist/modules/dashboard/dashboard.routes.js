"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = dashboardRoutes;
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const log_controller_1 = require("../logs/log.controller");
const log_schema_1 = require("../logs/log.schema");
async function dashboardRoutes(app) {
    const router = app.withTypeProvider();
    // Dashboard Overview Metrics (GET /dashboard/overview)
    router.get("/overview", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            querystring: log_schema_1.dashboardQuerySchema,
        },
    }, log_controller_1.logController.getDashboardOverview);
    // Timeline Logs over time (GET /dashboard/timeline)
    router.get("/timeline", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            querystring: log_schema_1.dashboardQuerySchema,
        },
    }, log_controller_1.logController.getDashboardTimeline);
    // Log Levels Count (GET /dashboard/log-levels)
    router.get("/log-levels", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            querystring: log_schema_1.dashboardQuerySchema,
        },
    }, log_controller_1.logController.getDashboardLogLevels);
    // Services Count (GET /dashboard/services)
    router.get("/services", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            querystring: log_schema_1.dashboardQuerySchema,
        },
    }, log_controller_1.logController.getDashboardServices);
    // Recent Error Logs list (GET /dashboard/recent-errors)
    router.get("/recent-errors", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            querystring: log_schema_1.dashboardQuerySchema,
        },
    }, log_controller_1.logController.getDashboardRecentErrors);
}
