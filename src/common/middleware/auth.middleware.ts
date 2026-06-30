import { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest<any>, reply: FastifyReply<any>) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
}
