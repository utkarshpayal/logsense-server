import { FastifyReply, FastifyRequest } from "fastify";
import { apiKeyService } from "../../modules/apiKeys/api-key.service";
import { UnauthorizedError } from "../errors/unauthorized.error";

export async function authenticateApiKey(
  request: FastifyRequest<any>,
  reply: FastifyReply<any>
) {
  const apiKeyHeader = request.headers["x-api-key"] as string | undefined;

  if (!apiKeyHeader) {
    throw new UnauthorizedError("API key is required in 'x-api-key' header");
  }

  // Use reusable verification service
  const apiKey = await apiKeyService.verify(apiKeyHeader);

  // Attach credentials to request
  request.apiKey = apiKey;
}
