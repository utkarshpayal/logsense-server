import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { projectRoutes } from "./modules/projects/project.routes";
import { apiKeyRoutes } from "./modules/apiKeys/api-key.routes";
import { logRoutes } from "./modules/logs/log.routes";
import { eventRoutes } from "./modules/logs/events.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { BaseError } from "./common/errors/base.error";

import zlib from "zlib";

export const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Support decompression of GZIP request bodies from SDK
app.addHook("preParsing", (request, reply, payload, done) => {
  const contentEncoding = request.headers["content-encoding"];
  if (contentEncoding === "gzip") {
    const unzip = zlib.createGunzip();

    // Attach and track receivedEncodedLength dynamically as compressed chunks arrive
    (unzip as any).receivedEncodedLength = 0;
    payload.on("data", (chunk) => {
      (unzip as any).receivedEncodedLength += chunk.length;
    });

    // Forward the error event from the original payload stream
    payload.on("error", (err) => unzip.emit("error", err));

    payload.pipe(unzip);
    done(null, unzip);
  } else {
    done(null, payload);
  }
});


app.setErrorHandler((error: any, request, reply) => {
  if (error instanceof BaseError) {
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

app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});

app.register(sensible);

app.register(jwt, {
  secret: env.JWT_SECRET,
});

// Health Check Endpoint
app.get("/health", async (request, reply) => {
  return reply.code(200).send({ status: "OK", timestamp: new Date() });
});

//auth routes
app.register(authRoutes, {
  prefix: '/auth',
});

//project routes
app.register(projectRoutes, {
  prefix: '/projects',
});

//api-keys routes
app.register(apiKeyRoutes, {
  prefix: '/api-keys',
});

//logs routes
app.register(logRoutes, {
  prefix: '/logs',
});

//event route
app.register(eventRoutes);

//dashboard routes
app.register(dashboardRoutes, {
  prefix: '/dashboard',
});

//ai routes TODO: need to fix it 
app.register(aiRoutes, {
  prefix: '/projects',
});

