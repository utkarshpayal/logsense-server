import { app } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function Server() {
  await connectDB();

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  console.log(`Server running on ${env.PORT}`);
}

Server();