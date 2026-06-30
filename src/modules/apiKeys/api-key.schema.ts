import { z } from "zod";

export const createApiKeySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Please add API Key name")
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name cannot exceed 100 characters"),

    environment: z.enum(["development", "staging", "production"], {
        message: "Environment must be one of: development, staging, production",
    }),
});

export const apiKeyParamsSchema = z.object({
    id: z.string().uuid("Invalid API Key ID format (UUID expected)"),
});

export const projectApiKeyParamsSchema = z.object({
    projectId: z.string().uuid("Invalid Project ID format (UUID expected)"),
});

export type CreateApiKeyDto = z.infer<typeof createApiKeySchema>;
export type ApiKeyParamsDto = z.infer<typeof apiKeyParamsSchema>;
export type ProjectApiKeyParamsDto = z.infer<
    typeof projectApiKeyParamsSchema
>;

export const updateApiKeyStatusSchema = z.object({
    isActive: z.boolean(),
});

export type UpdateApiKeyStatusDto = z.infer<typeof updateApiKeyStatusSchema>;
