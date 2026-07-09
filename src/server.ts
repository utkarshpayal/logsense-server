import { app } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { logsScheduler } from "./modules/logs/logs.scheduler";

async function Server() {
  await connectDB();

  // Initialize the daily AI report scheduler
  logsScheduler.startDailyReportScheduler();

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  console.log(`Server running on ${env.PORT}`);
}

Server();