"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.db = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.db = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
});
const connectDB = async () => {
    try {
        await exports.db.query("SELECT NOW()");
        console.log("Database connected successfully!");
    }
    catch (error) {
        console.error("Database connection failed!");
        process.exit(1);
    }
};
exports.connectDB = connectDB;
