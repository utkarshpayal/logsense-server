/**
 * SchemaRegistry
 *
 * Single source of truth for JSONB key expressions used in SQL queries.
 * All repositories and tools MUST reference these constants.
 * Never hardcode metadata key strings inside SQL elsewhere.
 */
export const SchemaRegistry = {
  logs: {
    // ── HTTP ──────────────────────────────────────────────────────────────
    /** Returns int — use in arithmetic, AVG, MAX */
    latencyMs:       "(metadata->>'latency_ms')::int",
    /** Returns text — use in IS NOT NULL, GROUP BY */
    latencyMsText:   "metadata->>'latency_ms'",
    statusCode:      "metadata->>'statusCode'",
    method:          "metadata->>'method'",
    /** Normalized route preferred; falls back to raw URL */
    url:             "COALESCE(metadata->>'route', metadata->>'url')",

    // ── User identity ─────────────────────────────────────────────────────
    userId:          "metadata->>'userId'",
    userIdAlt:       "metadata->>'user_id'",
    userEmail:       "metadata->>'email'",
    userIdNested:    "metadata->'responseBody'->>'userId'",
    userIdResp:      "metadata->'responseBody'->'user'->>'id'",
    userName:        "metadata->'responseBody'->'user'->>'name'",
    /** COALESCE across all identity locations — use for GROUP BY / COUNT DISTINCT */
    userIdAll: `COALESCE(
      metadata->>'userId',
      metadata->>'user_id',
      metadata->'responseBody'->>'userId',
      metadata->'responseBody'->'user'->>'id'
    )`,

    // ── Database ──────────────────────────────────────────────────────────
    dbTable:         "metadata->>'table'",
    dbQuery:         "metadata->>'query'",
    /** Returns int */
    dbDuration:      "(metadata->>'queryDurationMs')::int",
    dbDurationText:  "metadata->>'queryDurationMs'",

    // ── Redis ─────────────────────────────────────────────────────────────
    redisCommand:    "metadata->>'redisCommand'",
    redisKey:        "metadata->>'redisKey'",
    redisDuration:   "(metadata->>'redisDurationMs')::int",

    // ── Errors ────────────────────────────────────────────────────────────
    error:           "metadata->>'error'",
    exception:       "metadata->>'exception'",
    errorMessage:    "COALESCE(metadata->>'error', metadata->>'exception')",
  },
} as const;

export type LogsSchemaKey = keyof typeof SchemaRegistry.logs;
