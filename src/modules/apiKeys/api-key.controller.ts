import { TypedRequest, TypedReply } from "../../types/fastify";
import { apiKeyService } from "./api-key.service";
import {
  CreateApiKeyDto,
  ApiKeyParamsDto,
  ProjectApiKeyParamsDto,
  UpdateApiKeyStatusDto,
} from "./api-key.schema";

class ApiKeyController {

  //create api key for project controller
  async createApiKey(
    request: TypedRequest<{
      Params: ProjectApiKeyParamsDto;
      Body: CreateApiKeyDto;
    }>,
    reply: TypedReply<{
      Params: ProjectApiKeyParamsDto;
      Body: CreateApiKeyDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const { projectId } = request.params;
      const apiKey = await apiKeyService.createApiKey(projectId, request.body);

      return reply.code(201).send({
        success: true,
        message: "API Key created successfully",
        data: apiKey,
      });
    } catch (error: any) {
      if (error.message === "Project not found") {
        return reply.notFound("Project not found");
      }
      return reply.internalServerError(error.message || "Failed to create API key");
    }
  }

  //get api keys for project controller
  async getApiKeys(
    request: TypedRequest<{
      Params: ProjectApiKeyParamsDto;
    }>,
    reply: TypedReply<{
      Params: ProjectApiKeyParamsDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const { projectId } = request.params;
      const keys = await apiKeyService.getApiKeys(projectId);

      return reply.send({
        success: true,
        data: keys,
      });
    } catch (error: any) {
      if (error.message === "Project not found") {
        return reply.notFound("Project not found");
      }
      return reply.internalServerError(error.message || "Failed to fetch API keys");
    }
  }

  //delete a api key controller
  async deleteApiKey(
    request: TypedRequest<{
      Params: ApiKeyParamsDto;
    }>,
    reply: TypedReply<{
      Params: ApiKeyParamsDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const { id } = request.params;
      await apiKeyService.deleteApiKey(id);

      return reply.send({
        success: true,
        message: "API Key deleted successfully",
      });
    } catch (error: any) {
      if (error.message === "API key not found") {
        return reply.notFound("API key not found");
      }
      return reply.internalServerError(error.message || "Failed to delete API key");
    }
  }

  //rotate api key controller
  async rotateApiKey(
    request: TypedRequest<{
      Params: ApiKeyParamsDto;
    }>,
    reply: TypedReply<{
      Params: ApiKeyParamsDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const { id } = request.params;
      const result = await apiKeyService.rotateApiKey(id);

      return reply.send({
        success: true,
        message: "API Key rotated successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message === "API key not found") {
        return reply.notFound("API key not found");
      }
      return reply.internalServerError(error.message || "Failed to rotate API key");
    }
  }

  //update api key status controller
  async updateActiveStatus(
    request: TypedRequest<{
      Params: ApiKeyParamsDto;
      Body: UpdateApiKeyStatusDto;
    }>,
    reply: TypedReply<{
      Params: ApiKeyParamsDto;
      Body: UpdateApiKeyStatusDto;
    }>
  ) {
    try {
      if (!request.user || !request.user.sub) {
        return reply.unauthorized("Authentication required");
      }

      const { id } = request.params;
      const { isActive } = request.body;
      const apiKey = await apiKeyService.updateActiveStatus(id, isActive);

      return reply.send({
        success: true,
        message: `API Key ${isActive ? "enabled" : "disabled"} successfully`,
        data: apiKey,
      });
    } catch (error: any) {
      if (error.message === "API key not found") {
        return reply.notFound("API key not found");
      }
      return reply.internalServerError(error.message || "Failed to update API key status");
    }
  }

  //verify api key controller
  async verifyApiKey(
    request: TypedRequest,
    reply: TypedReply
  ) {
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
    } catch (error: any) {
      return reply.internalServerError(error.message || "Verification failed");
    }
  }
}

export const apiKeyController = new ApiKeyController();