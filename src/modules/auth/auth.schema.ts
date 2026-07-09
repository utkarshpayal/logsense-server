import { z } from "zod";

//register schema
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .email("Invalid email address")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
});

//login schema
export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),

  password: z.string().min(1, "Password is required")
});

//refresh tokens schema
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});


export type LoginDto = z.infer<typeof loginSchema>;

export type RegisterDto = z.infer<typeof registerSchema>;

export type RefreshDto = z.infer<typeof refreshSchema>;