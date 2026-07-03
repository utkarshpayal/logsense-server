import { db } from "../../../config/db";

export class IssueRepository {
  async getTopIssues(projectId: string) {
    const query = `
      SELECT 
        message, 
        COUNT(*) as error_count, 
        MAX(created_at) as last_seen
      FROM logs 
      WHERE project_id = $1 AND level IN ('error', 'fatal')
      GROUP BY message
      ORDER BY error_count DESC
      LIMIT 10
    `;
    const res = await db.query(query, [projectId]);
    return res.rows;
  }
}

export const issueRepository = new IssueRepository();
