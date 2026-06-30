"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = void 0;
class JwtService {
    generateAccessToken(app, payload) {
        return app.jwt.sign(payload, {
            expiresIn: "15m",
        });
    }
    generateRefreshToken(app, payload) {
        return app.jwt.sign(payload, {
            expiresIn: "7d",
        });
    }
    verify(app, token) {
        return app.jwt.verify(token);
    }
    decode(app, token) {
        return app.jwt.decode(token);
    }
}
exports.jwtService = new JwtService();
