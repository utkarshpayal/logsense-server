/**
 * Ground Truth Extractor
 *
 * Deterministically extracts verifiable facts from raw database rows.
 * These facts are injected into the LLM summarizer as hard constraints
 * so the LLM can never fabricate or contradict actual data.
 */
export function extractGroundTruth(rows: any[]): string {
  if (rows.length === 0) {
    return "GROUND TRUTH: The database returned 0 rows — nothing was found.";
  }

  const lines: string[] = [
    `GROUND TRUTH: The database returned ${rows.length} row(s).`,
  ];

  const first = rows[0];
  for (const [col, val] of Object.entries(first)) {
    if (val === null || val === undefined || val === "") continue;
    const num = Number(val);
    if (!isNaN(num)) {
      lines.push(`GROUND TRUTH: column "${col}" = ${num}`);
      if (num > 0) {
        lines.push(
          `DERIVED FACT: "${col}" > 0 — any yes/no question MUST be answered YES. Count = ${num}.`
        );
      } else {
        lines.push(`DERIVED FACT: "${col}" = 0 — answer is NO / none / zero.`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Returns true if the LLM answer contradicts a non-zero result set.
 * Used to trigger automatic answer regeneration.
 */
export function detectContradiction(answer: string, rows: any[]): boolean {
  if (rows.length === 0) return false;
  const first = rows[0];
  for (const val of Object.values(first)) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const negative = /^(no[,.\s]|no\b|there are no|none|0 user|not found|nothing)/i;
      if (negative.test(answer.trim())) {
        console.warn("⚠️  [GroundTruth] LLM answer contradicts data — will retry.");
        return true;
      }
    }
  }
  return false;
}

/**
 * Minify rows to fit within LLM token budget (max 30 rows).
 * Strips sensitive fields and truncates long strings.
 */
export function minifyRows(rows: any[]): any[] {
  return rows.slice(0, 30).map((row) => {
    // Non-log rows (aggregate results, counts, etc.) — pass through safely
    if (!row.level && !row.message) {
      const safe: any = {};
      for (const [k, v] of Object.entries(row)) {
        if (k !== "password_hash" && k !== "key_hash") safe[k] = v;
      }
      return safe;
    }

    // Log rows — compact representation
    const m: any = {
      time: row.created_at,
      level: row.level,
      service: row.service,
    };
    if (row.message) m.msg = String(row.message).slice(0, 150);

    if (row.metadata && typeof row.metadata === "object") {
      const keep = [
        "method", "url", "route", "statusCode", "latency_ms",
        "error", "exception", "table", "query",
        "userId", "user_id", "email",
      ];
      const meta: any = {};
      for (const k of keep) {
        if (row.metadata[k] !== undefined) meta[k] = row.metadata[k];
      }
      const rb = row.metadata.responseBody;
      if (rb && typeof rb === "object") {
        if (rb.userId) meta.responseUserId = rb.userId;
        if (rb.user) meta.responseUser = { id: rb.user.id, name: rb.user.name, email: rb.user.email };
      }
      if (Object.keys(meta).length) m.meta = meta;
    }
    return m;
  });
}
