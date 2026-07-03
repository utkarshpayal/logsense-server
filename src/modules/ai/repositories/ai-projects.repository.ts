import { db } from "../../../config/db";

export interface ProjectInfoRow {
  project_id: string;
  project_name: string;
  project_slug: string;
  is_active: boolean;
  created_at: string;
  owner_name: string;
  owner_email: string;
}

export interface ApiKeyInfoRow {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export class AiProjectsRepository {
  async getProjectInfo(
    projectId: string
  ): Promise<{ sql: string; rows: ProjectInfoRow[] }> {
    const sql = `
SELECT
  p.id           AS project_id,
  p.name         AS project_name,
  p.slug         AS project_slug,
  p.is_active,
  p.created_at::text,
  u.name         AS owner_name,
  u.email        AS owner_email
FROM projects p
JOIN users u ON p.owner_id = u.id
WHERE p.id = $1`;
    const res = await db.query<ProjectInfoRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }

  async getApiKeyInfo(
    projectId: string
  ): Promise<{ sql: string; rows: ApiKeyInfoRow[] }> {
    const sql = `
SELECT
  id,
  name,
  prefix,
  environment,
  is_active,
  last_used_at::text,
  expires_at::text,
  created_at::text
FROM api_keys
WHERE project_id = $1
ORDER BY created_at DESC`;
    const res = await db.query<ApiKeyInfoRow>(sql, [projectId]);
    return { sql, rows: res.rows };
  }
}

export const aiProjectsRepository = new AiProjectsRepository();
