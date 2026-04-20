import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../db";
import { JwtPayload } from "../types";
import { JWT_SECRET, COOKIE_NAME } from "./schemas";

export function logout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const result = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [payload.userId],
    );
    if (result.rows.length === 0) {
      res.clearCookie(COOKIE_NAME);
      res.status(401).json({ error: "User not found" });
      return;
    }

    const user = result.rows[0];
    res.json({ userId: user.id, username: user.username });
  } catch {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: "Invalid token" });
  }
}
