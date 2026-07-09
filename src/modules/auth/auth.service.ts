import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";

import { authRepository } from "./auth.repository";
import { LoginDto, RegisterDto } from "./auth.schema";
import { jwtService } from "../../common/jwt/jwt.service";

class AuthService {
  //register service
  async register(data: RegisterDto) {
    const existingUser = await authRepository.findByEmail(data.email);

    //checking existing user
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

  //login service
  async login(data: LoginDto) {
    const user = await authRepository.login(data.email, data.password);
    return user;
  }

  //refresh service
  async refresh(app: FastifyInstance, refreshToken: string) {
    const payload = jwtService.verify(app, refreshToken) as { sub: string };
    const accessToken = jwtService.generateAccessToken(app, { sub: payload.sub });
    const newRefreshToken = jwtService.generateRefreshToken(app, { sub: payload.sub });
    return { accessToken, refreshToken: newRefreshToken };
  }

  //user profile service 
  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  //update user profile service
  async updateSettings(userId: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.discord_webhook_url !== undefined) updateData.discordWebhookUrl = data.discord_webhook_url;
    if (data.email_alerts !== undefined) updateData.emailAlerts = data.email_alerts;
    if (data.email_frequency !== undefined) updateData.emailFrequency = data.email_frequency;
    if (data.min_severity !== undefined) updateData.minSeverity = data.min_severity;
    if (data.discord_alerts !== undefined) updateData.discordAlerts = data.discord_alerts;
    if (data.retention_days !== undefined) updateData.retentionDays = data.retention_days;

    const user = await authRepository.update(userId, updateData);
    return user;
  }
}



export const authService = new AuthService();