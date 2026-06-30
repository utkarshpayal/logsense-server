"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApiKeyStatusSchema = exports.projectApiKeyParamsSchema = exports.apiKeyParamsSchema = exports.createApiKeySchema = void 0;
const zod_1 = require("zod");
exports.createApiKeySchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Please add API Key name")
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name cannot exceed 100 characters"),
    environment: zod_1.z.enum(["development", "staging", "production"], {
        message: "Environment must be one of: development, staging, production",
    }),
});
exports.apiKeyParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid API Key ID format (UUID expected)"),
});
exports.projectApiKeyParamsSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid("Invalid Project ID format (UUID expected)"),
});
exports.updateApiKeyStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
