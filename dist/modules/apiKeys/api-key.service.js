"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const api_key_repository_1 = require("./api-key.repository");
const project_repository_1 = require("../projects/project.repository");
const not_found_error_1 = require("../../common/errors/not-found.error");
const unauthorized_error_1 = require("../../common/errors/unauthorized.error");
class ApiKeyService {
    //create api key service
    async createApiKey(projectId, data) {
        const project = await project_repository_1.projectRepository.findById(projectId);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        const rawKey = `lsk_${node_crypto_1.default.randomBytes(32).toString("hex")}`;
        const keyHash = node_crypto_1.default
            .createHash("sha256")
            .update(rawKey)
            .digest("hex");
        const apiKey = await api_key_repository_1.apiKeyRepository.create({
            projectId,
            name: data.name,
            keyHash,
            prefix: rawKey.substring(0, 12),
            environment: data.environment,
        });
        return {
            ...apiKey,
            key: rawKey,
        };
    }
    //get api keys for project service
    async getApiKeys(projectId) {
        const project = await project_repository_1.projectRepository.findById(projectId);
        if (!project) {
            throw new not_found_error_1.NotFoundError("Project not found");
        }
        return api_key_repository_1.apiKeyRepository.findByProject(projectId);
    }
    //delete api key for project service
    async deleteApiKey(id) {
        const apiKey = await api_key_repository_1.apiKeyRepository.findById(id);
        if (!apiKey) {
            throw new not_found_error_1.NotFoundError("API key not found");
        }
        await api_key_repository_1.apiKeyRepository.delete(id);
    }
    //rotate api key for project service
    async rotateApiKey(id) {
        const apiKey = await api_key_repository_1.apiKeyRepository.findById(id);
        if (!apiKey) {
            throw new not_found_error_1.NotFoundError("API key not found");
        }
        const rawKey = `lsk_${node_crypto_1.default.randomBytes(32).toString("hex")}`;
        const keyHash = node_crypto_1.default
            .createHash("sha256")
            .update(rawKey)
            .digest("hex");
        const updatedApiKey = await api_key_repository_1.apiKeyRepository.update(id, {
            key_hash: keyHash,
            prefix: rawKey.substring(0, 12),
        });
        return {
            ...updatedApiKey,
            key: rawKey,
        };
    }
    //update active status of api key for project service
    async updateActiveStatus(id, isActive) {
        const apiKey = await api_key_repository_1.apiKeyRepository.findById(id);
        if (!apiKey) {
            throw new not_found_error_1.NotFoundError("API key not found");
        }
        return api_key_repository_1.apiKeyRepository.update(id, {
            is_active: isActive,
        });
    }
    //verify api key for project service
    async verify(rawApiKey) {
        const keyHash = node_crypto_1.default
            .createHash("sha256")
            .update(rawApiKey)
            .digest("hex");
        const apiKey = await api_key_repository_1.apiKeyRepository.findByHash(keyHash);
        if (!apiKey || !apiKey.is_active) {
            throw new unauthorized_error_1.UnauthorizedError("Invalid or inactive API key");
        }
        // Verify project still exists
        const project = await project_repository_1.projectRepository.findById(apiKey.project_id);
        if (!project) {
            throw new unauthorized_error_1.UnauthorizedError("Associated project not found");
        }
        // Trigger last used background update
        api_key_repository_1.apiKeyRepository.updateLastUsed(apiKey.id).catch(() => {
            // Ignore background update failures
        });
        return apiKey;
    }
}
exports.apiKeyService = new ApiKeyService();
