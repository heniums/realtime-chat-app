import { z } from "zod/v4";

export { JWT_SECRET } from "../config/env";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(50, "Username must be at most 50 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const JWT_EXPIRES_IN = "7d";
export const COOKIE_NAME = "token";
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export function setTokenCookie(
  res: import("express").Response,
  token: string,
): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  });
}
