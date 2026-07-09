import { db } from "../../config/db";

export interface CreateProjectRepoData {
  name: string;
  slug: string;
  description?: string | undefined;
  ownerId: string;
  discordWebhookUrl?: string | null;
  slackWebhookUrl?: string | null;
}

export interface UpdateProjectRepoData {
  name?: string | undefined;
  description?: string | undefined;
  discordWebhookUrl?: string | null;
  slackWebhookUrl?: string | null;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  discord_webhook_url: string | null;
  slack_webhook_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

class ProjectRepository {
  async create(data: CreateProjectRepoData): Promise<Project> {
    const result = await db.query<Project>(
      `
      INSERT INTO projects (
        name,
        slug,
        description,
        owner_id,
        discord_webhook_url,
        slack_webhook_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        owner_id,
        name,
        slug,
        description,
        discord_webhook_url,
        slack_webhook_url,
        is_active,
        created_at,
        updated_at;
      `,
      [
        data.name,
        data.slug,
        data.description || null,
        data.ownerId,
        data.discordWebhookUrl || null,
        data.slackWebhookUrl || null,
      ]
    );
    return result.rows[0]!;
  }

  async update(id: string, data: UpdateProjectRepoData): Promise<Project> {
    // Build dynamic UPDATE query to handle NULL values correctly (e.g. clearing a webhook)
    const updates: string[] = [];
    const values: any[] = [id];
    let paramCounter = 2;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCounter++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCounter++}`);
      values.push(data.description);
    }
    if (data.discordWebhookUrl !== undefined) {
      updates.push(`discord_webhook_url = $${paramCounter++}`);
      values.push(data.discordWebhookUrl);
    }
    if (data.slackWebhookUrl !== undefined) {
      updates.push(`slack_webhook_url = $${paramCounter++}`);
      values.push(data.slackWebhookUrl);
    }

    if (updates.length === 0) {
      const current = await this.findById(id);
      if (!current) throw new Error("Project not found");
      return current;
    }

    updates.push("updated_at = NOW()");

    const query = `
      UPDATE projects
      SET ${updates.join(", ")}
      WHERE id = $1 AND is_active = TRUE
      RETURNING
        id,
        owner_id,
        name,
        slug,
        description,
        discord_webhook_url,
        slack_webhook_url,
        is_active,
        created_at,
        updated_at;
    `;

    const result = await db.query<Project>(query, values);
    return result.rows[0]!;
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const result = await db.query<Project>(
      `
      SELECT
        id,
        owner_id,
        name,
        slug,
        description,
        discord_webhook_url,
        slack_webhook_url,
        is_active,
        created_at,
        updated_at
      FROM projects
      WHERE slug = $1 AND is_active = TRUE
      LIMIT 1;
      `,
      [slug]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0]!;
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    const result = await db.query<Project>(
      `
      SELECT
        id,
        owner_id,
        name,
        slug,
        description,
        discord_webhook_url,
        slack_webhook_url,
        is_active,
        created_at,
        updated_at
      FROM projects
      WHERE owner_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC;
      `,
      [ownerId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Project | null> {
    const result = await db.query<Project>(
      `
      SELECT
        id,
        owner_id,
        name,
        slug,
        description,
        discord_webhook_url,
        slack_webhook_url,
        is_active,
        created_at,
        updated_at
      FROM projects
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1;
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0]!;
  }

  async softDelete(id: string): Promise<void> {
    await db.query(
      `
      UPDATE projects
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1;
      `,
      [id]
    );
  }

  async findAllActiveProjects(): Promise<Project[]> {
    const result = await db.query<Project>(
      `
      SELECT
        id,
        owner_id,
        name,
        slug,
        description,
        discord_webhook_url,
        slack_webhook_url,
        is_active,
        created_at,
        updated_at
      FROM projects
      WHERE is_active = TRUE;
      `
    );
    return result.rows;
  }
}

export const projectRepository = new ProjectRepository();