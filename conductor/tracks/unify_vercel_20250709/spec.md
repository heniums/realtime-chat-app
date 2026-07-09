# Track: Unify client and server for single-command Vercel deployment

## Specification

### Background
The project currently runs as two completely separate packages:
- `client/` — Vite + React application with its own `package.json` and dev server (`npm run dev` on Vite's port)
- `server/` — Express + Socket.IO application with its own `package.json` and dev server (`npm run dev` on Express's port)

This separation requires running two terminals and two commands to develop, and makes deployment to Vercel (which expects a single entrypoint) difficult.

### Goal
Restructure the project so that:
1. A single root-level `package.json` provides unified commands:
   - `npm run dev` — starts both client and server in development mode
   - `npm run build` — builds the client and prepares the server for production
   - `npm start` — starts the production server (serving the built client)
2. The Express server serves the built Vite client static files in production.
3. The project is deployable to Vercel with minimal configuration.
4. All existing functionality (auth, rooms, messages, typing, reactions) continues to work unchanged.

### Non-Goals
- Rewriting application logic (React components, Socket.IO handlers)
- Changing the database or adding persistence
- Modifying the UI/UX of the chat application
- Migrating to a different framework or language

### Constraints
- Must preserve existing `client/` and `server/` source directories
- Must maintain TypeScript compilation for both sides
- Must preserve Socket.IO real-time functionality
- Must work within Vercel's serverless function limitations (if applicable)

### Acceptance Criteria
- [ ] `npm install` at the root installs dependencies for both client and server
- [ ] `npm run dev` at the root starts the full application in development mode
- [ ] `npm run build` at the root creates a production build
- [ ] `npm start` at the root serves the production application from a single port
- [ ] The Express server serves the built client `index.html` and static assets
- [ ] Socket.IO connections function correctly in both dev and production modes
- [ ] A `vercel.json` configuration file exists and routes API requests properly
- [ ] Environment variables are consolidated and documented
