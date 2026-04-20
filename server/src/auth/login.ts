import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyPassword } from "./password";
import { JwtPayload } from "../types";
import { loginSchema, JWT_SECRET, JWT_EXPIRES_IN, setTokenCookie } from "./schemas";
import { findUserWithHashByUsername } from "../db/queries/users";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { username, password } = parsed.data;

    const user = await findUserWithHashByUsername(username);
    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const payload: JwtPayload = { userId: user.id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    setTokenCookie(res, token);
    res.json({ userId: user.id, username: user.username });
  } catch (err: unknown) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
