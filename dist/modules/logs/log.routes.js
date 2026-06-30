"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRoutes = logRoutes;
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const api_key_auth_middleware_1 = require("../../common/middleware/api-key-auth.middleware");
const log_controller_1 = require("./log.controller");
const log_schema_1 = require("./log.schema");
async function logRoutes(app) {
    const router = app.withTypeProvider();
    // Ingest Log via API Key (POST /logs)
    router.post("/", {
        preHandler: [api_key_auth_middleware_1.authenticateApiKey],
        schema: {
            body: log_schema_1.createLogSchema,
        },
    }, log_controller_1.logController.createLog);
    // Retrieve Logs list via user JWT token (GET /logs)
    router.get("/", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            querystring: log_schema_1.getLogsQuerySchema,
        },
    }, log_controller_1.logController.getLogs);
    // Get Log Details (GET /logs/:id)
    router.get("/:id", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: log_schema_1.logParamsSchema,
        },
    }, log_controller_1.logController.getLog);
    // Delete a Log (DELETE /logs/:id)
    router.delete("/:id", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: log_schema_1.logParamsSchema,
        },
    }, log_controller_1.logController.deleteLog);
}
