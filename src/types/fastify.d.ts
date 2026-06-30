import "@fastify/jwt";
import { FastifyRequest, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { ApiKey } from "../modules/apiKeys/api-key.repository";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      sub: string;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: ApiKey;
  }
}

export type TypedRequest<RouteGeneric = any> = FastifyRequest<
  RouteGeneric,
  any,
  any,
  any,
  ZodTypeProvider
>;

export type TypedReply<RouteGeneric = any> = FastifyReply<
  RouteGeneric,
  any,
  any,
  any,
  any,
  any,
  ZodTypeProvider
>;
