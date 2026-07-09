const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== Phase 3 Verification Tests ===\n");

// Helper: read JSON safely
function readJson(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

// Helper: assert file exists
function assertExists(filePath, label) {
  const exists = fs.existsSync(filePath);
  assert.ok(exists, `${label} should exist at ${filePath}`);
  console.log(`✓ ${label} exists`);
}

// ─── Test 1: vercel.json configuration ──────────────────────────────────────

assertExists(path.join(__dirname, "..", "vercel.json"), "vercel.json");

const vercelConfig = readJson(path.join(__dirname, "..", "vercel.json"));
assert.strictEqual(vercelConfig.version, 2, "vercel.json version should be 2");
assert.ok(vercelConfig.buildCommand, "vercel.json should have buildCommand");
assert.ok(vercelConfig.outputDirectory, "vercel.json should have outputDirectory");
assert.ok(Array.isArray(vercelConfig.rewrites), "vercel.json rewrites should be an array");
assert.ok(
  vercelConfig.rewrites.some((r) => r.source.includes("socket.io")),
  "vercel.json should route /socket.io to the API"
);
assert.ok(
  vercelConfig.rewrites.some((r) => r.source === "/(.*)" && r.destination === "/index.html"),
  "vercel.json should have SPA catch-all rewrite to /index.html"
);
console.log("✓ vercel.json has valid structure and required routes");

// ─── Test 2: API entry point exists ───────────────────────────────────────────

assertExists(path.join(__dirname, "..", "api", "index.ts"), "api/index.ts");

const apiSource = fs.readFileSync(
  path.join(__dirname, "..", "api", "index.ts"),
  "utf-8"
);
assert.ok(apiSource.includes('createApp'), "api/index.ts should import createApp");
assert.ok(apiSource.includes('server.emit'), "api/index.ts should emit request on server");
console.log("✓ api/index.ts has correct serverless adapter pattern");

// ─── Test 3: Server app factory exists ──────────────────────────────────────

assertExists(path.join(__dirname, "..", "server", "src", "app.ts"), "server/src/app.ts");

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "server", "src", "app.ts"),
  "utf-8"
);
assert.ok(appSource.includes("export function createApp"), "app.ts should export createApp");
assert.ok(appSource.includes("AppBundle"), "app.ts should define AppBundle interface");
assert.ok(appSource.includes("express.static"), "app.ts should configure static file serving");
console.log("✓ server/src/app.ts exports createApp with static serving");

// ─── Test 4: Environment variables documented ─────────────────────────────────

assertExists(path.join(__dirname, "..", ".env.example"), ".env.example");

const envExample = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf-8");
assert.ok(envExample.includes("JWT_SECRET"), ".env.example should document JWT_SECRET");
assert.ok(envExample.includes("SOCKET_TRANSPORTS"), ".env.example should document SOCKET_TRANSPORTS");
assert.ok(
  envExample.includes("VITE_SOCKET_TRANSPORTS"),
  ".env.example should document VITE_SOCKET_TRANSPORTS"
);
console.log("✓ .env.example documents all required environment variables");

// ─── Test 5: Socket.IO transport fallback configured ──────────────────────────

const clientSocketSource = fs.readFileSync(
  path.join(__dirname, "..", "client", "src", "socket", "client.ts"),
  "utf-8"
);
assert.ok(
  clientSocketSource.includes("VITE_SOCKET_TRANSPORTS"),
  "client.ts should read VITE_SOCKET_TRANSPORTS"
);
assert.ok(
  clientSocketSource.includes("polling"),
  "client.ts should include polling in transports"
);
console.log("✓ Client Socket.IO configured for transport fallback");

const serverSocketSource = fs.readFileSync(
  path.join(__dirname, "..", "server", "src", "socket", "index.ts"),
  "utf-8"
);
assert.ok(
  serverSocketSource.includes("SOCKET_TRANSPORTS"),
  "server socket/index.ts should read SOCKET_TRANSPORTS"
);
assert.ok(
  serverSocketSource.includes("polling"),
  "server socket/index.ts should include polling in transports"
);
console.log("✓ Server Socket.IO configured for transport fallback");

// ─── Test 6: README updated with deployment docs ──────────────────────────────

const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf-8");
assert.ok(readme.includes("Vercel"), "README should mention Vercel deployment");
assert.ok(readme.includes("SOCKET_TRANSPORTS"), "README should document SOCKET_TRANSPORTS");
assert.ok(readme.includes("npm workspaces"), "README should mention workspace architecture");
console.log("✓ README.md updated with deployment documentation");

console.log("\n=== All Phase 3 verification tests passed ===");
