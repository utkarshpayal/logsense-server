import { FastifyInstance } from "fastify";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "./jwt.types";

class JwtService {
  generateAccessToken(
    app: FastifyInstance,
    payload: AccessTokenPayload
  ) {
    return app.jwt.sign(payload, {
      expiresIn: "15m",
    });
  }

  generateRefreshToken(
    app: FastifyInstance,
    payload: RefreshTokenPayload
  ) {
    return app.jwt.sign(payload, {
      expiresIn: "7d",
    });
  }

  verify(app: FastifyInstance, token: string) {
    return app.jwt.verify(token);
  }

  decode(app: FastifyInstance, token: string) {
    return app.jwt.decode(token);
  }
}

export const jwtService = new JwtService();