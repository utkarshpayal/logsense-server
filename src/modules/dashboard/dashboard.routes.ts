import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { authenticate } from "../../common/middleware/auth.middleware";
import { logController } from "../logs/log.controller";
import { dashboardQuerySchema, DashboardQueryDto } from "../logs/log.schema";

export async function dashboardRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // Dashboard Overview Metrics (GET /dashboard/overview)
  router.get<{
    Querystring: DashboardQueryDto;
  }>(
    "/overview",
    {
      preHandler: [authenticate],
      schema: {
        querystring: dashboardQuerySchema,
      },
    },
    logController.getDashboardOverview
  );

  // Timeline Logs over time (GET /dashboard/timeline)
  router.get<{
    Querystring: DashboardQueryDto;
  }>(
    "/timeline",
    {
      preHandler: [authenticate],
      schema: {
        querystring: dashboardQuerySchema,
      },
    },
    logController.getDashboardTimeline
  );

  // Log Levels Count (GET /dashboard/log-levels)
  router.get<{
    Querystring: DashboardQueryDto;
  }>(
    "/log-levels",
    {
      preHandler: [authenticate],
      schema: {
        querystring: dashboardQuerySchema,
      },
    },
    logController.getDashboardLogLevels
  );

  // Services Count (GET /dashboard/services)
  router.get<{
    Querystring: DashboardQueryDto;
  }>(
    "/services",
    {
      preHandler: [authenticate],
      schema: {
        querystring: dashboardQuerySchema,
      },
    },
    logController.getDashboardServices
  );

  // Recent Error Logs list (GET /dashboard/recent-errors)
  router.get<{
    Querystring: DashboardQueryDto;
  }>(
    "/recent-errors",
    {
      preHandler: [authenticate],
      schema: {
        querystring: dashboardQuerySchema,
      },
    },
    logController.getDashboardRecentErrors
  );
}
