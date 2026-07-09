import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { authenticate } from "../../common/middleware/auth.middleware";
import { authenticateApiKey } from "../../common/middleware/api-key-auth.middleware";
import { logController } from "./log.controller";

import {
  ingestLogsSchema,
  getLogsQuerySchema,
  logParamsSchema,
  GetLogsQueryDto,
  LogParamsDto,
} from "./log.schema";

export async function logRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // ingets logs via api key route controller
  router.post<{
    Body: any;
  }>(
    "/",
    {
      preHandler: [authenticateApiKey],
      schema: {
        body: ingestLogsSchema,
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
