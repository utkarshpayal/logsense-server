import { db } from "../src/config/db";

async function run() {
  try {
    const keysRes = await db.query("SELECT * FROM api_keys LIMIT 5");
    console.log("API Keys:", JSON.stringify(keysRes.rows, null, 2));

    const logsRes = await db.query("SELECT COUNT(*)::int as count FROM logs");
    console.log("Logs Count:", logsRes.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}

run();
