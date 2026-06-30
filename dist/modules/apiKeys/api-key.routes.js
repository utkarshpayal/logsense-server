"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRoutes = apiKeyRoutes;
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const api_key_auth_middleware_1 = require("../../common/middleware/api-key-auth.middleware");
const api_key_controller_1 = require("./api-key.controller");
const api_key_schema_1 = require("./api-key.schema");
async function apiKeyRoutes(app) {
    const router = app.withTypeProvider();
    // Create API Key
    router.post("/projects/:projectId", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: api_key_schema_1.projectApiKeyParamsSchema,
            body: api_key_schema_1.createApiKeySchema,
        },
    }, api_key_controller_1.apiKeyController.createApiKey);
    // Get API Keys for a Project
    router.get("/projects/:projectId", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: api_key_schema_1.projectApiKeyParamsSchema,
        },
    }, api_key_controller_1.apiKeyController.getApiKeys);
    // Delete API Key
    router.delete("/:id", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: api_key_schema_1.apiKeyParamsSchema,
        },
    }, api_key_controller_1.apiKeyController.deleteApiKey);
    // Rotate API Key
    router.post("/:id/rotate", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: api_key_schema_1.apiKeyParamsSchema,
        },
    }, api_key_controller_1.apiKeyController.rotateApiKey);
    // Enable/Disable API Key Status
    router.patch("/:id/status", {
        preHandler: [auth_middleware_1.authenticate],
        schema: {
            params: api_key_schema_1.apiKeyParamsSchema,
            body: api_key_schema_1.updateApiKeyStatusSchema,
        },
    }, api_key_controller_1.apiKeyController.updateActiveStatus);
    // Verify API Key Validity
    router.get("/verify", {
        preHandler: [api_key_auth_middleware_1.authenticateApiKey],
    }, api_key_controller_1.apiKeyController.verifyApiKey);
}
