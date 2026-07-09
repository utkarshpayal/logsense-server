"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_schema_1 = require("./auth.schema");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
async function authRoutes(app) {
    app.post("/register", {
        schema: {
            body: auth_schema_1.registerSchema
        }
    }, auth_controller_1.authController.register);
    app.post("/login", {
        schema: {
            body: auth_schema_1.loginSchema
        }
    }, auth_controller_1.authController.login);
    app.post("/logout", auth_controller_1.authController.logout);
    app.post("/refresh", {
        schema: {
            body: auth_schema_1.refreshSchema
        }
    }, auth_controller_1.authController.refresh);
    app.get("/me", {
        preHandler: [auth_middleware_1.authenticate]
    }, auth_controller_1.authController.me);
    app.put("/settings", {
        preHandler: [auth_middleware_1.authenticate]
    }, auth_controller_1.authController.updateSettings);
}
