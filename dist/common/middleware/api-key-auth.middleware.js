"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateApiKey = authenticateApiKey;
const api_key_service_1 = require("../../modules/apiKeys/api-key.service");
const unauthorized_error_1 = require("../errors/unauthorized.error");
async function authenticateApiKey(request, reply) {
    const apiKeyHeader = request.headers["x-api-key"];
    if (!apiKeyHeader) {
        throw new unauthorized_error_1.UnauthorizedError("API key is required in 'x-api-key' header");
    }
    // Use reusable verification service
    const apiKey = await api_key_service_1.apiKeyService.verify(apiKeyHeader);
    // Attach credentials to request
    request.apiKey = apiKey;
}
