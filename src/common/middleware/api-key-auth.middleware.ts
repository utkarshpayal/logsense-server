import { FastifyReply, FastifyRequest } from "fastify";
import { apiKeyService } from "../../modules/apiKeys/api-key.service";
import { UnauthorizedError } from "../errors/unauthorized.error";

export async function authenticateApiKey(
  request: FastifyRequest<any>,
  reply: FastifyReply<any>
) {
  let apiKeyHeader = request.headers["x-api-key"] as string | undefined;

  if (!apiKeyHeader) {
    const authHeader = request.headers["authorization"] as string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      apiKeyHeader = authHeader.substring(7);
    }
  }

  if (!apiKeyHeader) {
    throw new UnauthorizedError("API key is required in 'x-api-key' or 'Authorization' header");
  }

  // Use reusable verification service
  const apiKey = await apiKeyService.verify(apiKeyHeader);

  // Attach credentials to request
  request.apiKey = apiKey;
}
