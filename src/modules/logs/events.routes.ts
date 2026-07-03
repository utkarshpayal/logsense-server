import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticateApiKey } from "../../common/middleware/api-key-auth.middleware";
import { logController } from "./log.controller";
import { ingestLogsSchema } from "./log.schema";

export async function eventRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // Ingest events via POST /events
  router.post<{
    Body: any;
  }>(
    "/events",
    {
      preHandler: [authenticateApiKey],
      schema: {
        body: ingestLogsSchema,
      },
    },
    logController.createLog
  );

  // Ingest events via POST /v1/events
  router.post<{
    Body: any;
  }>(
    "/v1/events",
    {
      preHandler: [authenticateApiKey],
      schema: {
        body: ingestLogsSchema,
      },
    },
    logController.createLog
  );
}
