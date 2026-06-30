import { z } from "zod";

export const aiChatParamsSchema = z.object({
  projectId: z.string().uuid("Invalid Project ID format (UUID expected)"),
});

export const aiChatBodySchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
});

export type AiChatParamsDto = z.infer<typeof aiChatParamsSchema>;
export type AiChatBodyDto = z.infer<typeof aiChatBodySchema>;
