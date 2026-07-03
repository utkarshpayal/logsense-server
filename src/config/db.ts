import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

export const connectDB = async () => {
  try {
    await db.query("SELECT NOW()");
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed!", error);
    process.exit(1);
  }
};
