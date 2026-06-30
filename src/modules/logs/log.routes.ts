import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { authenticate } from "../../common/middleware/auth.middleware";
import { authenticateApiKey } from "../../common/middleware/api-key-auth.middleware";
import { logController } from "./log.controller";

import {
  createLogSchema,
  getLogsQuerySchema,
  logParamsSchema,
  CreateLogDto,
  GetLogsQueryDto,
  LogParamsDto,
} from "./log.schema";

export async function logRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // Ingest Log via API Key (POST /logs)
  router.post<{
    Body: CreateLogDto;
  }>(
    "/",
    {
      preHandler: [authenticateApiKey],
      schema: {
        body: createLogSchema,
      },
    },
    logController.createLog
  );

  // Retrieve Logs list via user JWT token (GET /logs)
  router.get<{
    Querystring: GetLogsQueryDto;
  }>(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        querystring: getLogsQuerySchema,
      },
    },
    logController.getLogs
  );

  // Get Log Details (GET /logs/:id)
  router.get<{
    Params: LogParamsDto;
  }>(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        params: logParamsSchema,
      },
    },
    logController.getLog
  );

  // Delete a Log (DELETE /logs/:id)
  router.delete<{
    Params: LogParamsDto;
  }>(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        params: logParamsSchema,
      },
    },
    logController.deleteLog
  );
}
