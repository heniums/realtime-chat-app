import pool from "..";
import { UserRow, UserWithHashRow, mapUser } from "./mappers";

export interface AuthUser {
  id: string;
  username: string;
}

/**
 * Find a user by username. Returns null if not found.
 * Used by login flow — includes password_hash for verification.
 */
export async function findUserWithHashByUsername(
  username: string,
): Promise<(AuthUser & { passwordHash: string }) | null> {
  const result = await pool.query<UserWithHashRow>(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [username.trim()],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, username: row.username, passwordHash: row.password_hash };
}

/**
 * Find a user by username without password_hash.
 * Used by register flow to check for duplicates.
 */
export async function findUserByUsername(
  username: string,
): Promise<AuthUser | null> {
  const result = await pool.query<UserRow>(
    "SELECT id, username FROM users WHERE username = $1",
    [username.trim()],
  );
  if (result.rows.length === 0) return null;
  return mapUser(result.rows[0]);
}

/**
 * Find a user by UUID. Returns null if not found.
 * Used by /auth/me and the socket JWT middleware.
 */
export async function findUserById(id: string): Promise<AuthUser | null> {
  const result = await pool.query<UserRow>(
    "SELECT id, username FROM users WHERE id = $1",
    [id],
  );
  if (result.rows.length === 0) return null;
  return mapUser(result.rows[0]);
}

/**
 * Insert a new user. Returns the newly created user.
 * Caller is responsible for hashing the password.
 * Throws if username is already taken (UNIQUE violation).
 */
export async function createUser(
  username: string,
  passwordHash: string,
): Promise<AuthUser> {
  const result = await pool.query<UserRow>(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
    [username, passwordHash],
  );
  return mapUser(result.rows[0]);
}
