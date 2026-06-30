import fs from "node:fs/promises";
import path from "node:path";

import { db } from "../config/db";

const MIGRATIONS_DIR = path.join(
  process.cwd(),
  "src",
  "database",
  "migrations"
);

async function createMigrationTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await db.query(`
    SELECT version
    FROM schema_migrations
    ORDER BY version;
  `);

  return new Set(result.rows.map((row) => row.version));
}

async function runMigrations() {
  console.log("🚀 Starting database migrations...\n");

  await createMigrationTable();

  const appliedMigrations = await getAppliedMigrations();

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const client = await db.connect();

  try {
    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`⏭ Skipping ${file}`);
        continue;
      }

      console.log(`\n📄 Running ${file}`);

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(filePath, "utf8");

      try {
        await client.query("BEGIN");

        await client.query(sql);

        await client.query(
          `
          INSERT INTO schema_migrations(version)
          VALUES($1)
          `,
          [file]
        );

        await client.query("COMMIT");

        console.log(`✅ Applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");

        console.error(`❌ Migration failed: ${file}`);
        console.error(error);

        process.exit(1);
      }
    }

    console.log("\n🎉 All migrations completed successfully.");
  } finally {
    client.release();
    await db.end();
  }
}

runMigrations().catch((error) => {
  console.error("Unexpected migration error");
  console.error(error);
  process.exit(1);
});