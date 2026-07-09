"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
class AuthController {
    async register(request, reply) {
        const user = await auth_service_1.authService.register(request.body);
        const accessToken = request.server.jwt.sign({ sub: user.id }, { expiresIn: "15m" });
        const refreshToken = request.server.jwt.sign({ sub: user.id }, { expiresIn: "7d" });
        return reply.code(201).send({
            success: true,
            message: "User registered successfully",
            data: {
                user,
                accessToken,
                refreshToken,
            },
        });
    }
    async login(request, reply) {
        const user = await auth_service_1.authService.login(request.body);
        const accessToken = request.server.jwt.sign({ sub: user.id }, { expiresIn: "15m" });
        const refreshToken = request.server.jwt.sign({ sub: user.id }, { expiresIn: "7d" });
        return reply.code(201).send({
            success: true,
            message: "User logged in successfully",
            data: {
                user,
                accessToken,
                refreshToken,
            },
        });
    }
    async logout(request, reply) {
        return reply.code(200).send({
            success: true,
            message: "Logged out successfully",
        });
    }
    async refresh(request, reply) {
        const tokens = await auth_service_1.authService.refresh(request.server, request.body.refreshToken);
        return reply.code(200).send({
            success: true,
            message: "Tokens refreshed successfully",
            data: tokens,
        });
    }
    async me(request, reply) {
        const user = await auth_service_1.authService.me(request.user.sub);
        return reply.code(200).send({
            success: true,
            data: user,
        });
    }
    async updateSettings(request, reply) {
        if (!request.user || !request.user.sub) {
            return reply.code(401).send({
                success: false,
                message: "Authentication required",
            });
        }
        try {
            const user = await auth_service_1.authService.updateSettings(request.user.sub, request.body);
            return reply.code(200).send({
                success: true,
                message: "Settings updated successfully",
                data: user,
            });
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                message: error.message || "Failed to update settings",
            });
        }
    }
}
exports.authController = new AuthController();
