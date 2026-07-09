"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectParamsSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Please add project name")
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name cannot exceed 100 characters"),
    description: zod_1.z
        .string()
        .trim()
        .max(500, "Description cannot exceed 500 characters")
        .optional(),
    discord_webhook_url: zod_1.z
        .string()
        .trim()
        .url("Invalid Discord Webhook URL")
        .optional()
        .nullable(),
    slack_webhook_url: zod_1.z
        .string()
        .trim()
        .url("Invalid Slack Webhook URL")
        .optional()
        .nullable(),
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name cannot exceed 100 characters")
        .optional(),
    description: zod_1.z
        .string()
        .trim()
        .max(500, "Description cannot exceed 500 characters")
        .optional(),
    discord_webhook_url: zod_1.z
        .string()
        .trim()
        .url("Invalid Discord Webhook URL")
        .optional()
        .nullable(),
    slack_webhook_url: zod_1.z
        .string()
        .trim()
        .url("Invalid Slack Webhook URL")
        .optional()
        .nullable(),
});
exports.projectParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid project ID format (UUID expected)"),
});
