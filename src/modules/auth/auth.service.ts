import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";

import { authRepository } from "./auth.repository";
import { LoginDto, RegisterDto } from "./auth.schema";
import { jwtService } from "../../common/jwt/jwt.service";

class AuthService {
  async register(data: RegisterDto) {
    const existingUser = await authRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("Email already exists");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await authRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
    });

    return user;
  }
  async login(data: LoginDto) {
    const user = await authRepository.login(data.email, data.password);
    return user;
  }

  async refresh(app: FastifyInstance, refreshToken: string) {
    const payload = jwtService.verify(app, refreshToken) as { sub: string };
    const accessToken = jwtService.generateAccessToken(app, { sub: payload.sub });
    const newRefreshToken = jwtService.generateRefreshToken(app, { sub: payload.sub });
    return { accessToken, refreshToken: newRefreshToken };
  }

  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
}



export const authService = new AuthService();