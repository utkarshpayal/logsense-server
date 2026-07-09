import { connectDB } from "../src/config/db";
import { projectRepository } from "../src/modules/projects/project.repository";
import { logsScheduler } from "../src/modules/logs/logs.scheduler";

async function runTest() {
  await connectDB();

  const projectId = "99b7141f-6d79-4933-bbd3-4d466055a26f"; // Test project ID

  console.log("Triggering report for project from database webhooks...");

  try {
    const summary = await logsScheduler.generateAndSendDailyReport(projectId);
    console.log("Generated AI Summary:\n", summary);
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    process.exit(0);
  }
}

runTest();
