import { z } from "zod";

export const createLogSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"], {
    message: "Level must be one of: debug, info, warn, error",
  }),
  message: z.string().min(1, "Message cannot be empty"),
  service: z.string().trim().optional(),
  environment: z.string().trim().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  traceId: z.string().trim().optional(),
  requestId: z.string().trim().optional(),
  hostname: z.string().trim().optional(),
});

export const getLogsQuerySchema = z.object({
  projectId: z.string().uuid("Invalid Project ID format (UUID expected)").optional(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  service: z.string().trim().optional(),
  environment: z.string().trim().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().datetime({ message: "Invalid startDate ISO string" }).optional(),
  endDate: z.string().datetime({ message: "Invalid endDate ISO string" }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(["created_at", "level", "service", "environment"]).default("created_at"),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC"),
});

export const projectLogParamsSchema = z.object({
  projectId: z.string().uuid("Invalid Project ID format (UUID expected)"),
});

export const logParamsSchema = z.object({
  id: z.string().uuid("Invalid Log ID format (UUID expected)"),
});

export const dashboardQuerySchema = z.object({
  projectId: z.string().uuid("Invalid Project ID format (UUID expected)").optional(),
});

export type CreateLogDto = z.infer<typeof createLogSchema>;
export type GetLogsQueryDto = z.infer<typeof getLogsQuerySchema>;
export type ProjectLogParamsDto = z.infer<typeof projectLogParamsSchema>;
export type LogParamsDto = z.infer<typeof logParamsSchema>;
export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;
