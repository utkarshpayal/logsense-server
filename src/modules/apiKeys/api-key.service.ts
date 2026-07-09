import crypto from "node:crypto";

import { apiKeyRepository, ApiKey } from "./api-key.repository";
import { projectRepository } from "../projects/project.repository";
import { CreateApiKeyDto } from "./api-key.schema";
import { NotFoundError } from "../../common/errors/not-found.error";
import { UnauthorizedError } from "../../common/errors/unauthorized.error";

class ApiKeyService {
    //create api key service
    async createApiKey(
        projectId: string,
        data: CreateApiKeyDto
    ) {
        const project = await projectRepository.findById(projectId);

        if (!project) {
            throw new NotFoundError("Project not found");
        }

        const rawKey = `lsk_${crypto.randomBytes(32).toString("hex")}`;

        const keyHash = crypto
            .createHash("sha256")
            .update(rawKey)
            .digest("hex");

        const apiKey = await apiKeyRepository.create({
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
    async getApiKeys(projectId: string) {
        const project = await projectRepository.findById(projectId);

        if (!project) {
            throw new NotFoundError("Project not found");
        }

        return apiKeyRepository.findByProject(projectId);
    }

    //delete api key for project service
    async deleteApiKey(id: string) {
        const apiKey = await apiKeyRepository.findById(id);

        if (!apiKey) {
            throw new NotFoundError("API key not found");
        }

        await apiKeyRepository.delete(id);
    }

    //rotate api key for project service
    async rotateApiKey(id: string) {
        const apiKey = await apiKeyRepository.findById(id);

        if (!apiKey) {
            throw new NotFoundError("API key not found");
        }

        const rawKey = `lsk_${crypto.randomBytes(32).toString("hex")}`;

        const keyHash = crypto
            .createHash("sha256")
            .update(rawKey)
            .digest("hex");

        const updatedApiKey = await apiKeyRepository.update(id, {
            key_hash: keyHash,
            prefix: rawKey.substring(0, 12),
        });

        return {
            ...updatedApiKey,
            key: rawKey,
        };
    }

    //update active status of api key for project service
    async updateActiveStatus(id: string, isActive: boolean) {
        const apiKey = await apiKeyRepository.findById(id);

        if (!apiKey) {
            throw new NotFoundError("API key not found");
        }

        return apiKeyRepository.update(id, {
            is_active: isActive,
        });
    }

    //verify api key for project service
    async verify(rawApiKey: string): Promise<ApiKey> {
        const keyHash = crypto
            .createHash("sha256")
            .update(rawApiKey)
            .digest("hex");

        const apiKey = await apiKeyRepository.findByHash(keyHash);

        if (!apiKey || !apiKey.is_active) {
            throw new UnauthorizedError("Invalid or inactive API key");
        }

        // Verify project still exists
        const project = await projectRepository.findById(apiKey.project_id);
        if (!project) {
            throw new UnauthorizedError("Associated project not found");
        }

        // Trigger last used background update
        apiKeyRepository.updateLastUsed(apiKey.id).catch(() => {
            // Ignore background update failures
        });

        return apiKey;
    }
}

export const apiKeyService = new ApiKeyService();