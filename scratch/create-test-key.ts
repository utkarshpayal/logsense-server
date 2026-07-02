import { apiKeyService } from "../src/modules/apiKeys/api-key.service";
import { db } from "../src/config/db";

async function run() {
  try {
    const projectRes = await db.query("SELECT id FROM projects WHERE is_active = TRUE LIMIT 1");
    if (projectRes.rows.length === 0) {
      console.error("No projects found in database!");
      return;
    }
    const projectId = projectRes.rows[0].id;
    console.log(`Using Project ID: ${projectId}`);

    const apiKeyData = await apiKeyService.createApiKey(projectId, {
      name: "Temporary Test Key",
      environment: "development",
    });

    console.log("Created API Key Successfully!");
    console.log("RAW KEY:", apiKeyData.key);
    console.log("Prefix:", apiKeyData.prefix);
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}

run();
