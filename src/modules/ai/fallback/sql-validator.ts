/**
 * SqlValidator
 *
 * Validates dynamically-generated SQL from the fallback generator.
 * Rejects write operations, unsafe statements, and unscoped log queries.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const WRITE_OPS = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|vacuum|analyze)\b/i;
const ALLOWED_TABLES = new Set(["logs", "api_keys", "projects", "users"]);

export class SqlValidator {
  validate(sql: string, projectId: string): ValidationResult {
    const s = sql.trim();

    // Must be a SELECT
    if (!/^\s*select\b/i.test(s)) {
      return { valid: false, reason: "Only SELECT queries are allowed." };
    }

    // No write operations
    if (WRITE_OPS.test(s)) {
      return { valid: false, reason: "Query contains a forbidden write operation." };
    }

    // No semicolons mid-query (prevent statement injection)
    const semiCount = (s.match(/;/g) ?? []).length;
    if (semiCount > 1) {
      return { valid: false, reason: "Multiple statements detected." };
    }

    // Table whitelist check
    const tableMatcher = /\bfrom\s+(\w+)|\bjoin\s+(\w+)/gi;
    let match: RegExpExecArray | null;
    while ((match = tableMatcher.exec(s)) !== null) {
      const table = (match[1] ?? match[2] ?? "").toLowerCase();
      if (table && !ALLOWED_TABLES.has(table)) {
        return { valid: false, reason: `Table "${table}" is not allowed.` };
      }
    }

    // Logs queries must be project-scoped
    const lower = s.toLowerCase();
    const touchesLogs = lower.includes("from logs") || lower.includes("join logs");
    if (touchesLogs) {
      const hasScope =
        lower.includes("project_id") &&
        lower.includes(projectId.toLowerCase());
      if (!hasScope) {
        return { valid: false, reason: "Log queries must be scoped to the project_id." };
      }
    }

    return { valid: true };
  }
}

export const sqlValidator = new SqlValidator();
