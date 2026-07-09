import { TypedRequest, TypedReply } from "../../types/fastify";
import { aiService } from "./ai.service";
import { AiChatParamsDto, AiChatBodyDto } from "./ai.schema";
import { projectRepository } from "../projects/project.repository";
import { NotFoundError } from "../../common/errors/not-found.error";
import { ForbiddenError } from "../../common/errors/forbidden.error";
import { UnauthorizedError } from "../../common/errors/unauthorized.error";

class AiController {
  // chat with ai logs assistant controller
  async chat(
    request: TypedRequest<{
      Params: AiChatParamsDto;
      Body: AiChatBodyDto;
    }>,
    reply: TypedReply<{
      Params: AiChatParamsDto;
      Body: AiChatBodyDto;
    }>
  ) {
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedError("Authentication required");
    }

    const { projectId } = request.params;
    const { prompt } = request.body;

    // 1. Authorize project access for user
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    if (project.owner_id !== request.user.sub) {
      throw new ForbiddenError("You do not have access to this project");
    }

    // 2. Process query using AI service
    const result = await aiService.queryLogs(projectId, prompt);

    return reply.send(result);
  }
}

export const aiController = new AiController();
