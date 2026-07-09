import { FastifyInstance } from "fastify";
import { authController } from "./auth.controller";
import { loginSchema, registerSchema, refreshSchema } from "./auth.schema";
import { authenticate } from "../../common/middleware/auth.middleware";

export async function authRoutes(app: FastifyInstance) {

  //register route
  app.post("/register", {
    schema: {
      body: registerSchema
    }
  }, authController.register);

  //login route
  app.post("/login", {
    schema: {
      body: loginSchema
    }
  }, authController.login);

  //logout route
  app.post("/logout", authController.logout);

  //refresh tokens route
  app.post("/refresh", {
    schema: {
      body: refreshSchema
    }
  }, authController.refresh);

  // get user profile
  app.get("/me", {
    preHandler: [authenticate]
  }, authController.me);

  // update user settings route
  app.put("/settings", {
    preHandler: [authenticate]
  }, authController.updateSettings);
}