import { db } from "../../../config/db";

export class BusinessRepository {
  async getProjectInfo(projectId: string) {
    const query = `
      SELECT id, name, slug, is_active, created_at 
      FROM projects 
      WHERE id = $1
    `;
    const res = await db.query(query, [projectId]);
    return res.rows[0];
  }

  async getApiKeys(projectId: string) {
    const query = `
      SELECT name, prefix, is_active, environment, last_used_at
      FROM api_keys
      WHERE project_id = $1
    `;
    const res = await db.query(query, [projectId]);
    return res.rows;
  }
}

export const businessRepository = new BusinessRepository();
