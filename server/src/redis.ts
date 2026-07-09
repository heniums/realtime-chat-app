import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

export const redis = REDIS_URL ? new Redis(REDIS_URL) : null;

export function isRedisEnabled(): boolean {
  return redis !== null;
}
