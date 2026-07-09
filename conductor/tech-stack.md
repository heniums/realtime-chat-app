# Tech Stack

## Overview
A full-stack real-time chat application using a separated client/server architecture with Socket.IO for WebSocket communication.

## Client

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | TypeScript | ~6.0.2 | Type-safe UI development |
| Framework | React | 19.2.4 | Component-based UI |
| Routing | React Router DOM | 7.14.0 | Client-side navigation |
| Build Tool | Vite | 8.0.4 | Fast development and production builds |
| Styling | TailwindCSS | 4.2.2 | Utility-first CSS |
| Real-time | Socket.IO Client | 4.8.3 | Bidirectional event-based communication |
| Linting | ESLint | 9.39.4 | Code quality (with typescript-eslint) |
| Utilities | clsx, emoji-picker-react, @floating-ui/react | latest | ClassName merging, emoji selection, UI positioning |

## Server

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | — | JavaScript execution environment |
| Framework | Express | 5.2.1 | HTTP server and RESTful routing |
| Language | TypeScript | ^6.0.2 | Type-safe server development |
| Dev Server | ts-node-dev | 2.0.0 | Fast TypeScript development with auto-reload |
| Real-time | Socket.IO | 4.8.3 | WebSocket abstraction with room support |
| Auth | jsonwebtoken | 9.0.3 | JWT token generation and verification |
| Config | dotenv | 17.4.1 | Environment variable management |
| CORS | cors | 2.8.6 | Cross-origin resource sharing |

## Shared
- **Shared Types:** `shared/types.ts` — Centralized TypeScript interfaces and Socket.IO event constants used by both client and server.

## Package Manager
- **npm** — Used for both client and server workspaces (separate `package.json` files).

## Architecture Notes
- The project is organized as a pseudo-monorepo with `client/`, `server/`, and `shared/` directories at the root level.
- No workspace manager (e.g., pnpm workspaces, npm workspaces, Turborepo) is currently in use.
- Both client and server use TypeScript with independent build pipelines (`vite build` and `tsc`).
