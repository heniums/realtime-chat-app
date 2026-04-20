import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../db";
import { hashPassword } from "./password";
import { JwtPayload } from "../types";
import { registerSchema, JWT_SECRET, JWT_EXPIRES_IN, setTokenCookie } from "./schemas";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { username, password } = parsed.data;

    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username],
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const hash = await hashPassword(password);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hash],
    );
    const user = result.rows[0];

    const payload: JwtPayload = { userId: user.id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    setTokenCookie(res, token);
    res.status(201).json({ userId: user.id, username: user.username });
  } catch (err: unknown) {
    console.error("[auth] register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
