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
}

export interface UserWithoutPassword {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

class AuthRepository {
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
        updated_at
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

  async findById(id: string): Promise<UserWithoutPassword | null> {
    const result = await db.query<UserWithoutPassword>(
      `
      SELECT
        id,
        name,
        email,
        is_verified,
        created_at,
        updated_at
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
        updated_at;
      `,
      [data.name, data.email, data.passwordHash]
    );

    return result.rows[0]!;
  }

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