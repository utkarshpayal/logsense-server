import { db } from "../../config/db";

export interface CreateApiKeyData {
  projectId: string;
  name: string;
  keyHash: string;
  prefix: string;
  environment: string;
}

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_hash: string;
  prefix: string;
  environment: string;
  is_active: boolean;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

class ApiKeyRepository {
  async create(data: CreateApiKeyData): Promise<ApiKey> {
    const result = await db.query<ApiKey>(
      `
      INSERT INTO api_keys
      (
        project_id,
        name,
        key_hash,
        prefix,
        environment
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING *;
      `,
      [
        data.projectId,
        data.name,
        data.keyHash,
        data.prefix,
        data.environment,
      ]
    );

    return result.rows[0]!;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const result = await db.query<ApiKey>(
      `
      SELECT *
      FROM api_keys
      WHERE id = $1
      LIMIT 1;
      `,
      [id]
    );

    return result.rows.length ? result.rows[0]! : null;
  }

  async findByProject(projectId: string): Promise<ApiKey[]> {
    const result = await db.query<ApiKey>(
      `
      SELECT *
      FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC;
      `,
      [projectId]
    );

    return result.rows;
  }

  async findByHash(hash: string): Promise<ApiKey | null> {
    const result = await db.query<ApiKey>(
      `
      SELECT *
      FROM api_keys
      WHERE key_hash = $1
      LIMIT 1;
      `,
      [hash]
    );

    return result.rows.length ? result.rows[0]! : null;
  }

  async delete(id: string): Promise<void> {
    await db.query(
      `
      DELETE FROM api_keys
      WHERE id = $1;
      `,
      [id]
    );
  }

  async update(id: string, data: { name?: string; is_active?: boolean; key_hash?: string; prefix?: string }): Promise<ApiKey> {
    const fields: string[] = [];
    const values: any[] = [id];
    let index = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(data.name);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(data.is_active);
    }
    if (data.key_hash !== undefined) {
      fields.push(`key_hash = $${index++}`);
      values.push(data.key_hash);
    }
    if (data.prefix !== undefined) {
      fields.push(`prefix = $${index++}`);
      values.push(data.prefix);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error("API key not found");
      return existing;
    }

    const result = await db.query<ApiKey>(
      `
      UPDATE api_keys
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      values
    );

    if (result.rows.length === 0) {
      throw new Error("API key not found");
    }

    return result.rows[0]!;
  }

  async updateLastUsed(id: string): Promise<void> {
    await db.query(
      `
      UPDATE api_keys
      SET last_used_at = NOW()
      WHERE id = $1;
      `,
      [id]
    );
  }
}

export const apiKeyRepository = new ApiKeyRepository();
