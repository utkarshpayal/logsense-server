"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
//register schema
exports.registerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name cannot exceed 100 characters"),
    email: zod_1.z
        .email("Invalid email address")
        .trim()
        .toLowerCase(),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100)
});
//login schema
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.email().trim().toLowerCase(),
    password: zod_1.z.string().min(1, "Password is required")
});
//refresh tokens schema
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Refresh token is required")
});
