import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../common/middleware/auth.middleware";
import { aiController } from "./ai.controller";
import { aiChatBodySchema, aiChatParamsSchema, AiChatParamsDto, AiChatBodyDto } from "./ai.schema";

export async function aiRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // Chat with AI logs assistant (POST /projects/:projectId/ai/chat)
  router.post<{
    Params: AiChatParamsDto;
    Body: AiChatBodyDto;
  }>(
    "/:projectId/ai/chat",
    {
      preHandler: [authenticate],
      schema: {
        params: aiChatParamsSchema,
        body: aiChatBodySchema,
      },
    },
    aiController.chat
  );
}
