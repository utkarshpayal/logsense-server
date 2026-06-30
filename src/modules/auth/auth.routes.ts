import { FastifyInstance } from "fastify";
import { authController } from "./auth.controller";
import { loginSchema, registerSchema, refreshSchema } from "./auth.schema";
import { authenticate } from "../../common/middleware/auth.middleware";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", {
    schema: {
      body: registerSchema
    }
  }, authController.register);

  app.post("/login", {
    schema: {
      body: loginSchema
    }
  }, authController.login);

  app.post("/logout", authController.logout);

  app.post("/refresh", {
    schema: {
      body: refreshSchema
    }
  }, authController.refresh);

  app.get("/me", {
    preHandler: [authenticate]
  }, authController.me);
}