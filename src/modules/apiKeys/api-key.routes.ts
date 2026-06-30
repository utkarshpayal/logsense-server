import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { authenticate } from "../../common/middleware/auth.middleware";
import { authenticateApiKey } from "../../common/middleware/api-key-auth.middleware";
import { apiKeyController } from "./api-key.controller";

import {
  createApiKeySchema,
  apiKeyParamsSchema,
  projectApiKeyParamsSchema,
  updateApiKeyStatusSchema,
  CreateApiKeyDto,
  ApiKeyParamsDto,
  ProjectApiKeyParamsDto,
  UpdateApiKeyStatusDto,
} from "./api-key.schema";

export async function apiKeyRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // Create API Key
  router.post<{
    Params: ProjectApiKeyParamsDto;
    Body: CreateApiKeyDto;
  }>(
    "/projects/:projectId",
    {
      preHandler: [authenticate],
      schema: {
        params: projectApiKeyParamsSchema,
        body: createApiKeySchema,
      },
    },
    apiKeyController.createApiKey
  );

  // Get API Keys for a Project
  router.get<{
    Params: ProjectApiKeyParamsDto;
  }>(
    "/projects/:projectId",
    {
      preHandler: [authenticate],
      schema: {
        params: projectApiKeyParamsSchema,
      },
    },
    apiKeyController.getApiKeys
  );

  // Delete API Key
  router.delete<{
    Params: ApiKeyParamsDto;
  }>(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        params: apiKeyParamsSchema,
      },
    },
    apiKeyController.deleteApiKey
  );

  // Rotate API Key
  router.post<{
    Params: ApiKeyParamsDto;
  }>(
    "/:id/rotate",
    {
      preHandler: [authenticate],
      schema: {
        params: apiKeyParamsSchema,
      },
    },
    apiKeyController.rotateApiKey
  );

  // Enable/Disable API Key Status
  router.patch<{
    Params: ApiKeyParamsDto;
    Body: UpdateApiKeyStatusDto;
  }>(
    "/:id/status",
    {
      preHandler: [authenticate],
      schema: {
        params: apiKeyParamsSchema,
        body: updateApiKeyStatusSchema,
      },
    },
    apiKeyController.updateActiveStatus
  );

  // Verify API Key Validity
  router.get(
    "/verify",
    {
      preHandler: [authenticateApiKey],
    },
    apiKeyController.verifyApiKey
  );
}