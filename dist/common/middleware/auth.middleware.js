"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch (err) {
        return reply.code(401).send({
            success: false,
            message: "Unauthorized",
        });
    }
}
