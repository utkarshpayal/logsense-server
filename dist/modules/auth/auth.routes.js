"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_schema_1 = require("./auth.schema");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
async function authRoutes(app) {
    //register route
    app.post("/register", {
        schema: {
            body: auth_schema_1.registerSchema
        }
    }, auth_controller_1.authController.register);
    //login route
    app.post("/login", {
        schema: {
            body: auth_schema_1.loginSchema
        }
    }, auth_controller_1.authController.login);
    //logout route
    app.post("/logout", auth_controller_1.authController.logout);
    //refresh tokens route
    app.post("/refresh", {
        schema: {
            body: auth_schema_1.refreshSchema
        }
    }, auth_controller_1.authController.refresh);
    // get user profile
    app.get("/me", {
        preHandler: [auth_middleware_1.authenticate]
    }, auth_controller_1.authController.me);
    // update user settings route
    app.put("/settings", {
        preHandler: [auth_middleware_1.authenticate]
    }, auth_controller_1.authController.updateSettings);
}
