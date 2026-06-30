"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const db_1 = require("../config/db");
const MIGRATIONS_DIR = node_path_1.default.join(process.cwd(), "src", "database", "migrations");
async function createMigrationTable() {
    await db_1.db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
async function getAppliedMigrations() {
    const result = await db_1.db.query(`
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
    const files = (await promises_1.default.readdir(MIGRATIONS_DIR))
        .filter((file) => file.endsWith(".sql"))
        .sort();
    if (files.length === 0) {
        console.log("No migration files found.");
        return;
    }
    const client = await db_1.db.connect();
    try {
        for (const file of files) {
            if (appliedMigrations.has(file)) {
                console.log(`⏭ Skipping ${file}`);
                continue;
            }
            console.log(`\n📄 Running ${file}`);
            const filePath = node_path_1.default.join(MIGRATIONS_DIR, file);
            const sql = await promises_1.default.readFile(filePath, "utf8");
            try {
                await client.query("BEGIN");
                await client.query(sql);
                await client.query(`
          INSERT INTO schema_migrations(version)
          VALUES($1)
          `, [file]);
                await client.query("COMMIT");
                console.log(`✅ Applied ${file}`);
            }
            catch (error) {
                await client.query("ROLLBACK");
                console.error(`❌ Migration failed: ${file}`);
                console.error(error);
                process.exit(1);
            }
        }
        console.log("\n🎉 All migrations completed successfully.");
    }
    finally {
        client.release();
        await db_1.db.end();
    }
}
runMigrations().catch((error) => {
    console.error("Unexpected migration error");
    console.error(error);
    process.exit(1);
});
