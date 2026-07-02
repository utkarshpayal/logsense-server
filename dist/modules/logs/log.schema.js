"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = exports.logParamsSchema = exports.projectLogParamsSchema = exports.getLogsQuerySchema = exports.ingestLogsSchema = exports.createLogSchema = void 0;
const zod_1 = require("zod");
exports.createLogSchema = zod_1.z.object({
    level: zod_1.z.enum(["trace", "debug", "info", "warn", "error", "fatal"], {
        message: "Level must be one of: trace, debug, info, warn, error, fatal",
    }),
    message: zod_1.z.string().min(1, "Message cannot be empty"),
    service: zod_1.z.string().trim().optional(),
    environment: zod_1.z.string().trim().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    traceId: zod_1.z.string().trim().optional(),
    requestId: zod_1.z.string().trim().optional(),
    hostname: zod_1.z.string().trim().optional(),
});
exports.ingestLogsSchema = zod_1.z.union([
    zod_1.z.object({
        events: zod_1.z.array(zod_1.z.any()),
    }),
    zod_1.z.object({
        event: zod_1.z.any(),
    }),
    zod_1.z.array(zod_1.z.any()),
    zod_1.z.object({
        level: zod_1.z.string().optional(),
        message: zod_1.z.string().optional(),
        service: zod_1.z.string().optional(),
        environment: zod_1.z.string().optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        traceId: zod_1.z.string().optional(),
        requestId: zod_1.z.string().optional(),
        hostname: zod_1.z.string().optional(),
    }).passthrough(),
]);
exports.getLogsQuerySchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid("Invalid Project ID format (UUID expected)").optional(),
    level: zod_1.z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),
    service: zod_1.z.string().trim().optional(),
    environment: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().datetime({ message: "Invalid startDate ISO string" }).optional(),
    endDate: zod_1.z.string().datetime({ message: "Invalid endDate ISO string" }).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
    sortBy: zod_1.z.enum(["created_at", "level", "service", "environment"]).default("created_at"),
    sortOrder: zod_1.z.enum(["ASC", "DESC"]).default("DESC"),
});
exports.projectLogParamsSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid("Invalid Project ID format (UUID expected)"),
});
exports.logParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid Log ID format (UUID expected)"),
});
exports.dashboardQuerySchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid("Invalid Project ID format (UUID expected)").optional(),
});
