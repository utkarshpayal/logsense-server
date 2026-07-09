import 'dotenv/config';
import { db } from '../src/config/db';

async function check() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const res = await db.query(
    "SELECT COUNT(*) FROM logs WHERE project_id = '09cc189f-89ed-4bd0-8fe7-81299feb2242' AND created_at >= $1 AND (message ILIKE '%login%' OR metadata::text ILIKE '%login%')",
    [startOfToday]
  );
  console.log('Number of login logs today:', res.rows[0].count);
  
  const sample = await db.query(
    "SELECT id, level, message, metadata, created_at FROM logs WHERE project_id = '09cc189f-89ed-4bd0-8fe7-81299feb2242' AND created_at >= $1 AND (message ILIKE '%login%' OR metadata::text ILIKE '%login%') LIMIT 5",
    [startOfToday]
  );
  console.log('Sample logs:', JSON.stringify(sample.rows, null, 2));

  await db.end();
}
check().catch(console.error);
