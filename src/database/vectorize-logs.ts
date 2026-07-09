import "dotenv/config";
import { db } from "../config/db";
import { ollamaClient } from "../modules/ai/ollama.client";

async function run() {
  console.log("🚀 Starting log vectorization backfill...");

  // 1. Get all logs that don't have embeddings or have temporary zero-vectors
  // Let's filter out logs that have zero-vectors to allow retrying them
  const { rows } = await db.query(
    `SELECT id, level, service, message, metadata FROM logs 
     WHERE embedding IS NULL 
        OR embedding = array_fill(0, ARRAY[768])::vector`
  );

  const total = rows.length;
  console.log(`📋 Found ${total} logs that need embeddings.`);

  if (total === 0) {
    console.log("✅ All logs already have embeddings.");
    process.exit(0);
  }

  // 2. Process sequentially with short delays or small batch concurrency (max 3)
  const CONCURRENCY = 3;
  let successCount = 0;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    console.log(`🔄 Processing logs ${i + 1} to ${Math.min(i + CONCURRENCY, total)} of ${total}...`);

    const promises = chunk.map(async (row) => {
      try {
        const textToEmbed = `${row.level} ${row.service || ""} ${row.message} ${row.metadata ? JSON.stringify(row.metadata) : ""}`;
        const embedding = await ollamaClient.generateEmbedding(textToEmbed);

        // Check if we got a fallback zero-vector
        const isAllZeros = embedding.every(v => v === 0);
        if (isAllZeros) {
          throw new Error("Received zero-vector from Ollama Client.");
        }

        await db.query(
          "UPDATE logs SET embedding = $1::vector WHERE id = $2",
          [JSON.stringify(embedding), row.id]
        );
        successCount++;
      } catch (err: any) {
        console.error(`❌ Failed to vectorize log ID ${row.id}:`, err.message);
      }
    });

    await Promise.all(promises);
    // Add small delay to let Ollama breathe
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(`\n🎉 Backfill completed. Successfully vectorized ${successCount}/${total} logs.`);
  await db.end();
}

run().catch((err) => {
  console.error("Fatal error during log vectorization:", err);
  process.exit(1);
});
