"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.db = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.db = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
    ssl: env_1.env.DATABASE_URL.includes("localhost") || env_1.env.DATABASE_URL.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
});
const connectDB = async () => {
    try {
        await exports.db.query("SELECT NOW()");
        console.log("Database connected successfully!");
    }
    catch (error) {
        console.error("Database connection failed!", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
