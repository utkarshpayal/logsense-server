"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const env_1 = require("./config/env");
const auth_routes_1 = require("./modules/auth/auth.routes");
const project_routes_1 = require("./modules/projects/project.routes");
const api_key_routes_1 = require("./modules/apiKeys/api-key.routes");
const log_routes_1 = require("./modules/logs/log.routes");
const dashboard_routes_1 = require("./modules/dashboard/dashboard.routes");
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const base_error_1 = require("./common/errors/base.error");
exports.app = (0, fastify_1.default)({
    logger: true,
});
exports.app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
exports.app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
exports.app.setErrorHandler((error, request, reply) => {
    if (error instanceof base_error_1.BaseError) {
        return reply.status(error.statusCode).send({
            success: false,
            message: error.message,
        });
    }
    if (error.validation) {
        return reply.status(400).send({
            success: false,
            message: error.message,
            errors: error.validation,
        });
    }
    request.log.error(error);
    return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || "Internal Server Error",
    });
});
exports.app.register(cors_1.default, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
});
exports.app.register(sensible_1.default);
exports.app.register(jwt_1.default, {
    secret: env_1.env.JWT_SECRET,
});
exports.app.register(auth_routes_1.authRoutes, {
    prefix: '/auth',
});
exports.app.register(project_routes_1.projectRoutes, {
    prefix: '/projects',
});
exports.app.register(api_key_routes_1.apiKeyRoutes, {
    prefix: '/api-keys',
});
exports.app.register(log_routes_1.logRoutes, {
    prefix: '/logs',
});
exports.app.register(dashboard_routes_1.dashboardRoutes, {
    prefix: '/dashboard',
});
