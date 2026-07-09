# Implementation Plan: Unify client and server for single-command Vercel deployment

## Phase 1: Root Project Structure & Dependency Consolidation [checkpoint: a7b582a]

- [x] Task: Analyze current root structure and identify all dependencies [61d6c80]
    - [x] List all client dependencies and devDependencies
    - [x] List all server dependencies and devDependencies
    - [x] Identify overlapping dependencies (typescript, @types/node, etc.)
    - [x] Identify dependency conflicts (e.g., different TypeScript versions)
- [x] Task: Create root package.json with workspace structure [b6b1441]
    - [x] Add root metadata (name, version, private, type)
    - [x] Add workspaces array: `["client", "server"]`
    - [x] Add `concurrently` to root devDependencies
    - [x] Add unified root scripts:
        - `dev`: `concurrently \"npm run dev -w server\" \"npm run dev -w client\"`
        - `build`: Build client then compile server
        - `start`: Start compiled server
        - `install:all`: Install all workspace dependencies
- [x] Task: Deduplicate and hoist shared dependencies [4ca0a86]
    - [x] Move shared dependencies (typescript, @types/node) to root
    - [x] Update client/package.json to remove hoisted deps
    - [x] Update server/package.json to remove hoisted deps
    - [x] Verify `npm install` works from root
- [x] Task: Configure root .gitignore and environment handling [ca34582]
    - [x] Ensure root .gitignore covers all build outputs
    - [x] Create root .env.example documenting required env vars
    - [x] Ensure client and server env var loading still works
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Root Project Structure & Dependency Consolidation' (Protocol in workflow.md)

## Phase 2: Build Integration & Static File Serving [checkpoint: 04bad1e]

- [x] Task: Configure client build output for server consumption [524824c]
    - [x] Update client/vite.config.ts to set `build.outDir` to a predictable path (e.g., `../dist/client`)
    - [x] Verify build output includes `index.html` and static assets
    - [x] Ensure Socket.IO client connects to correct URL in production
- [x] Task: Implement Express static file serving in production [00b2c3c]
    - [x] Add middleware to serve `dist/client` static files
    - [x] Add catch-all route to serve `index.html` for SPA routing
    - [x] Ensure this only activates in production (not dev) to avoid conflicts with Vite dev server
- [x] Task: Write unified build script [4893488]
    - [x] Script builds client first: `npm run build -w client`
    - [x] Then compiles server: `npm run build -w server`
    - [x] Verify dist/ directory contains both client and server outputs
- [x] Task: Verify production start command [4893488]
    - [x] `npm start` runs compiled server from dist/
    - [x] Server correctly serves static files on the same port
    - [x] Socket.IO connections work via the unified port
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Build Integration & Static File Serving' (Protocol in workflow.md)

## Phase 3: Vercel Deployment Configuration [checkpoint: e4ae24f]

- [x] Task: Create vercel.json configuration [5da7d8b]
    - [x] Define builds for both client and server
    - [x] Configure rewrites: API/socket routes → server, everything else → client
    - [x] Set output directory for static files
    - [x] Configure install/build/start commands
- [x] Task: Consolidate and document environment variables [5da7d8b]
    - [x] List all env vars needed by client (e.g., VITE_API_URL)
    - [x] List all env vars needed by server (e.g., JWT_SECRET, PORT)
    - [x] Create .env.example at root with all variables
    - [x] Update README with deployment instructions
- [x] Task: Verify serverless compatibility and document limitations [5da7d8b]
    - [x] Socket.IO polling transport tested locally — works correctly
    - [x] Vercel serverless identified as incompatible (session state not shared across invocations)
    - [x] Documented limitation: real-time chat requires single-instance host (Railway, Render, Fly.io, VPS)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Vercel Deployment Configuration' (Protocol in workflow.md)

## Phase 4: End-to-End Verification & Cleanup

- [x] Task: Run full unified build test
    - [x] Execute `npm run build` from root — PASS (client + server compile cleanly)
    - [x] Verify dist/ structure is correct — PASS
    - [x] Run `npm start` and verify application loads in browser — PASS (integration test)
    - [x] Verify all chat features work — PASS (tested via polling-only script)
- [x] Task: Run unified dev workflow test
    - [x] Execute `npm run dev` from root — PASS (both servers start concurrently)
    - [x] Verify both servers start concurrently — PASS (server:3001 + client:5173)
    - [x] Verify client can connect to server in dev mode — PASS
    - [x] Verify hot reload works for client code — PASS (Vite HMR active)
- [x] Task: Update documentation
    - [x] Update README.md with new unified commands — DONE
    - [x] Add deployment section to README with Vercel limitation warning — DONE
    - [x] Update .env.example with transport variables — DONE
- [x] Task: Final cleanup and commit
    - [x] Remove temporary files — DONE (cleaned /tmp/test-polling.js)
    - [x] Ensure no broken imports or references — PASS (build succeeds)
    - [x] Run linting across both workspaces — DONE (1 pre-existing client lint error noted)
    - [x] All changes committed — PASS
- [ ] Task: Conductor - User Manual Verification 'Phase 4: End-to-End Verification & Cleanup' (Protocol in workflow.md)
