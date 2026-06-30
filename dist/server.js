"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
async function Server() {
    await (0, db_1.connectDB)();
    await app_1.app.listen({
        port: env_1.env.PORT,
        host: "0.0.0.0",
    });
    console.log(`Server running on ${env_1.env.PORT}`);
}
Server();
