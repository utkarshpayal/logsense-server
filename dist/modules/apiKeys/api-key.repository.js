"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRepository = void 0;
const db_1 = require("../../config/db");
class ApiKeyRepository {
    async create(data) {
        const result = await db_1.db.query(`
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
      `, [
            data.projectId,
            data.name,
            data.keyHash,
            data.prefix,
            data.environment,
        ]);
        return result.rows[0];
    }
    async findById(id) {
        const result = await db_1.db.query(`
      SELECT *
      FROM api_keys
      WHERE id = $1
      LIMIT 1;
      `, [id]);
        return result.rows.length ? result.rows[0] : null;
    }
    async findByProject(projectId) {
        const result = await db_1.db.query(`
      SELECT *
      FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC;
      `, [projectId]);
        return result.rows;
    }
    async findByHash(hash) {
        const result = await db_1.db.query(`
      SELECT *
      FROM api_keys
      WHERE key_hash = $1
      LIMIT 1;
      `, [hash]);
        return result.rows.length ? result.rows[0] : null;
    }
    async delete(id) {
        await db_1.db.query(`
      DELETE FROM api_keys
      WHERE id = $1;
      `, [id]);
    }
    async update(id, data) {
        const fields = [];
        const values = [id];
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
            if (!existing)
                throw new Error("API key not found");
            return existing;
        }
        const result = await db_1.db.query(`
      UPDATE api_keys
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `, values);
        if (result.rows.length === 0) {
            throw new Error("API key not found");
        }
        return result.rows[0];
    }
    async updateLastUsed(id) {
        await db_1.db.query(`
      UPDATE api_keys
      SET last_used_at = NOW()
      WHERE id = $1;
      `, [id]);
    }
}
exports.apiKeyRepository = new ApiKeyRepository();
