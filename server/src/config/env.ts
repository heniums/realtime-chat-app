/**
 * Centralized environment configuration.
 *
 * All required environment variables are validated at module load. If any are
 * missing or empty, the server fails to boot with a clear error — rather than
 * silently falling back to insecure defaults.
 *
 * Import typed constants from here instead of reading `process.env` directly.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[config] Missing required environment variable: ${name}. ` +
        `Set it in server/.env or your deployment environment before starting the server.`,
    );
  }
  return value;
}

export const JWT_SECRET = requireEnv("JWT_SECRET");
