import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please add project name")
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  discord_webhook_url: z
    .string()
    .trim()
    .url("Invalid Discord Webhook URL")
    .optional()
    .nullable(),

  slack_webhook_url: z
    .string()
    .trim()
    .url("Invalid Slack Webhook URL")
    .optional()
    .nullable(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  discord_webhook_url: z
    .string()
    .trim()
    .url("Invalid Discord Webhook URL")
    .optional()
    .nullable(),

  slack_webhook_url: z
    .string()
    .trim()
    .url("Invalid Slack Webhook URL")
    .optional()
    .nullable(),
});

export const projectParamsSchema = z.object({
  id: z.string().uuid("Invalid project ID format (UUID expected)"),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ProjectParamsDto = z.infer<typeof projectParamsSchema>;