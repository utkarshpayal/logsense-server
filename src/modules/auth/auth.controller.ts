import { FastifyReply, FastifyRequest } from "fastify";
import { authService } from "./auth.service";
import { LoginDto, RegisterDto, RefreshDto } from "./auth.schema";

class AuthController {
  //register controller
  async register(
    request: FastifyRequest<{
      Body: RegisterDto;
    }>,
    reply: FastifyReply
  ) {
    const user = await authService.register(request.body);

    const accessToken = request.server.jwt.sign(
      { sub: user.id },
      { expiresIn: "15m" }
    );

    const refreshToken = request.server.jwt.sign(
      { sub: user.id },
      { expiresIn: "7d" }
    );

    return reply.code(201).send({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  }

  //login controller
  async login(request: FastifyRequest<{
    Body: LoginDto;
  }>,
    reply: FastifyReply) {
    const user = await authService.login(request.body);

    const accessToken = request.server.jwt.sign(
      { sub: user.id },
      { expiresIn: "15m" }
    );

    const refreshToken = request.server.jwt.sign(
      { sub: user.id },
      { expiresIn: "7d" }
    );

    return reply.code(201).send({
      success: true,
      message: "User logged in successfully",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });

  }

  //logout controller
  async logout(request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).send({
      success: true,
      message: "Logged out successfully",
    });
  }

  //refresh tokens controller
  async refresh(
    request: FastifyRequest<{
      Body: RefreshDto;
    }>,
    reply: FastifyReply
  ) {
    const tokens = await authService.refresh(request.server, request.body.refreshToken);
    return reply.code(200).send({
      success: true,
      message: "Tokens refreshed successfully",
      data: tokens,
    });
  }

  //user controller
  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await authService.me(request.user.sub);
    return reply.code(200).send({
      success: true,
      data: user,
    });
  }

  // settings controller
  async updateSettings(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user || !request.user.sub) {
      return reply.code(401).send({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const user = await authService.updateSettings(request.user.sub, request.body);
      return reply.code(200).send({
        success: true,
        message: "Settings updated successfully",
        data: user,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || "Failed to update settings",
      });
    }
  }
}

export const authController = new AuthController();