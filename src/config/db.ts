import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
});

export const connectDB = async () => {
  try {
    await db.query("SELECT NOW()");
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed!");
    process.exit(1);
  }
};
