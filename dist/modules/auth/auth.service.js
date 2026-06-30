"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_repository_1 = require("./auth.repository");
const jwt_service_1 = require("../../common/jwt/jwt.service");
class AuthService {
    async register(data) {
        const existingUser = await auth_repository_1.authRepository.findByEmail(data.email);
        if (existingUser) {
            throw new Error("Email already exists");
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 10);
        const user = await auth_repository_1.authRepository.create({
            name: data.name,
            email: data.email,
            passwordHash,
        });
        return user;
    }
    async login(data) {
        const user = await auth_repository_1.authRepository.login(data.email, data.password);
        return user;
    }
    async refresh(app, refreshToken) {
        const payload = jwt_service_1.jwtService.verify(app, refreshToken);
        const accessToken = jwt_service_1.jwtService.generateAccessToken(app, { sub: payload.sub });
        const newRefreshToken = jwt_service_1.jwtService.generateRefreshToken(app, { sub: payload.sub });
        return { accessToken, refreshToken: newRefreshToken };
    }
    async me(userId) {
        const user = await auth_repository_1.authRepository.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
}
exports.authService = new AuthService();
