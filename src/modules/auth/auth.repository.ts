import { db } from "../../config/db";
import bcrypt from "bcrypt";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  discord_webhook_url: string | null;
  email_alerts: boolean;
  email_frequency: string;
  min_severity: string;
  discord_alerts: boolean;
  retention_days: number;
}


export interface UserWithoutPassword {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  discord_webhook_url: string | null;
  email_alerts: boolean;
  email_frequency: string;
  min_severity: string;
  discord_alerts: boolean;
  retention_days: number;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export interface UpdateUserRepoData {
  name?: string;
  email?: string;
  discordWebhookUrl?: string | null;
  emailAlerts?: boolean;
  emailFrequency?: string;
  minSeverity?: string;
  discordAlerts?: boolean;
  retentionDays?: number;
}

class AuthRepository {
  //find by email service
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query<User>(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        is_verified,
        created_at,
        updated_at,
        discord_webhook_url,
        email_alerts,
        email_frequency,
        min_severity,
        discord_alerts,
        retention_days
      FROM users
      WHERE email = $1
      LIMIT 1;
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0]!;
  }

  //find by id service
  async findById(id: string): Promise<UserWithoutPassword | null> {
    const result = await db.query<UserWithoutPassword>(
      `
      SELECT
        id,
        name,
        email,
        is_verified,
        created_at,
        updated_at,
        discord_webhook_url,
        email_alerts,
        email_frequency,
        min_severity,
        discord_alerts,
        retention_days
      FROM users
      WHERE id = $1
      LIMIT 1;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0]!;
  }

  //create new user service
  async create(data: CreateUserData): Promise<UserWithoutPassword> {
    const result = await db.query<UserWithoutPassword>(
      `
      INSERT INTO users
      (
        name,
        email,
        password_hash
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING
        id,
        name,
        email,
        is_verified,
        created_at,
        updated_at,
        discord_webhook_url,
        email_alerts,
        email_frequency,
        min_severity,
        discord_alerts,
        retention_days;
      `,
      [data.name, data.email, data.passwordHash]
    );

    return result.rows[0]!;
  }

  //update user service
  async update(id: string, data: UpdateUserRepoData): Promise<UserWithoutPassword> {
    const updates: string[] = [];
    const values: any[] = [id];
    let paramCounter = 2;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCounter++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCounter++}`);
      values.push(data.email);
    }
    if (data.discordWebhookUrl !== undefined) {
      updates.push(`discord_webhook_url = $${paramCounter++}`);
      values.push(data.discordWebhookUrl);
    }
    if (data.emailAlerts !== undefined) {
      updates.push(`email_alerts = $${paramCounter++}`);
      values.push(data.emailAlerts);
    }
    if (data.emailFrequency !== undefined) {
      updates.push(`email_frequency = $${paramCounter++}`);
      values.push(data.emailFrequency);
    }
    if (data.minSeverity !== undefined) {
      updates.push(`min_severity = $${paramCounter++}`);
      values.push(data.minSeverity);
    }
    if (data.discordAlerts !== undefined) {
      updates.push(`discord_alerts = $${paramCounter++}`);
      values.push(data.discordAlerts);
    }
    if (data.retentionDays !== undefined) {
      updates.push(`retention_days = $${paramCounter++}`);
      values.push(data.retentionDays);
    }

    if (updates.length === 0) {
      const current = await this.findById(id);
      if (!current) throw new Error("User not found");
      return current;
    }

    updates.push("updated_at = NOW()");

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING
        id,
        name,
        email,
        is_verified,
        created_at,
        updated_at,
        discord_webhook_url,
        email_alerts,
        email_frequency,
        min_severity,
        discord_alerts,
        retention_days;
    `;

    const result = await db.query<UserWithoutPassword>(query, values);
    return result.rows[0]!;
  }

  //login user service
  async login(email: string, passwordPlain: string): Promise<UserWithoutPassword> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }
    const isPasswordValid = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
}

export const authRepository = new AuthRepository();