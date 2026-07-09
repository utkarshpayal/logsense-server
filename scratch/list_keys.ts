import 'dotenv/config';
import { db } from '../src/config/db';

async function checkRecentLogs() {
  const result = await db.query(
    "SELECT id, project_id, level, message, metadata, created_at FROM logs ORDER BY created_at DESC LIMIT 3;"
  );
  console.log("3 MOST RECENT LOGS with Project ID:");
  console.log(JSON.stringify(result.rows, null, 2));

  await db.end();
}
checkRecentLogs().catch(console.error);
