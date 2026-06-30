"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyController = void 0;
const api_key_service_1 = require("./api-key.service");
class ApiKeyController {
    async createApiKey(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const { projectId } = request.params;
            const apiKey = await api_key_service_1.apiKeyService.createApiKey(projectId, request.body);
            return reply.code(201).send({
                success: true,
                message: "API Key created successfully",
                data: apiKey,
            });
        }
        catch (error) {
            if (error.message === "Project not found") {
                return reply.notFound("Project not found");
            }
            return reply.internalServerError(error.message || "Failed to create API key");
        }
    }
    async getApiKeys(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const { projectId } = request.params;
            const keys = await api_key_service_1.apiKeyService.getApiKeys(projectId);
            return reply.send({
                success: true,
                data: keys,
            });
        }
        catch (error) {
            if (error.message === "Project not found") {
                return reply.notFound("Project not found");
            }
            return reply.internalServerError(error.message || "Failed to fetch API keys");
        }
    }
    async deleteApiKey(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const { id } = request.params;
            await api_key_service_1.apiKeyService.deleteApiKey(id);
            return reply.send({
                success: true,
                message: "API Key deleted successfully",
            });
        }
        catch (error) {
            if (error.message === "API key not found") {
                return reply.notFound("API key not found");
            }
            return reply.internalServerError(error.message || "Failed to delete API key");
        }
    }
    async rotateApiKey(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const { id } = request.params;
            const result = await api_key_service_1.apiKeyService.rotateApiKey(id);
            return reply.send({
                success: true,
                message: "API Key rotated successfully",
                data: result,
            });
        }
        catch (error) {
            if (error.message === "API key not found") {
                return reply.notFound("API key not found");
            }
            return reply.internalServerError(error.message || "Failed to rotate API key");
        }
    }
    async updateActiveStatus(request, reply) {
        try {
            if (!request.user || !request.user.sub) {
                return reply.unauthorized("Authentication required");
            }
            const { id } = request.params;
            const { isActive } = request.body;
            const apiKey = await api_key_service_1.apiKeyService.updateActiveStatus(id, isActive);
            return reply.send({
                success: true,
                message: `API Key ${isActive ? "enabled" : "disabled"} successfully`,
                data: apiKey,
            });
        }
        catch (error) {
            if (error.message === "API key not found") {
                return reply.notFound("API key not found");
            }
            return reply.internalServerError(error.message || "Failed to update API key status");
        }
    }
    async verifyApiKey(request, reply) {
        try {
            if (!request.apiKey) {
                return reply.unauthorized("API Key is required");
            }
            return reply.send({
                success: true,
                message: "API Key is valid",
                data: {
                    id: request.apiKey.id,
                    name: request.apiKey.name,
                    environment: request.apiKey.environment,
                    projectId: request.apiKey.project_id,
                },
            });
        }
        catch (error) {
            return reply.internalServerError(error.message || "Verification failed");
        }
    }
}
exports.apiKeyController = new ApiKeyController();
