"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const db_1 = require("../../config/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
class AuthRepository {
    async findByEmail(email) {
        const result = await db_1.db.query(`
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
      `, [email]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    async findById(id) {
        const result = await db_1.db.query(`
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
      `, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    async create(data) {
        const result = await db_1.db.query(`
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
      `, [data.name, data.email, data.passwordHash]);
        return result.rows[0];
    }
    async login(email, passwordPlain) {
        const user = await this.findByEmail(email);
        if (!user) {
            throw new Error("User not found");
        }
        const isPasswordValid = await bcrypt_1.default.compare(passwordPlain, user.password_hash);
        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
exports.authRepository = new AuthRepository();
