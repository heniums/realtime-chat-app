# Implementation Plan: Unify client and server for single-command Vercel deployment

## Phase 1: Root Project Structure & Dependency Consolidation

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
- [ ] Task: Deduplicate and hoist shared dependencies
    - [ ] Move shared dependencies (typescript, @types/node, dotenv) to root
    - [ ] Update client/package.json to remove hoisted deps
    - [ ] Update server/package.json to remove hoisted deps
    - [ ] Verify `npm install` works from root
- [ ] Task: Configure root .gitignore and environment handling
    - [ ] Ensure root .gitignore covers all build outputs
    - [ ] Create root .env.example documenting required env vars
    - [ ] Ensure client and server env var loading still works
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Root Project Structure & Dependency Consolidation' (Protocol in workflow.md)

## Phase 2: Build Integration & Static File Serving

- [ ] Task: Configure client build output for server consumption
    - [ ] Update client/vite.config.ts to set `build.outDir` to a predictable path (e.g., `../dist/client`)
    - [ ] Verify build output includes `index.html` and static assets
    - [ ] Ensure Socket.IO client connects to correct URL in production
- [ ] Task: Implement Express static file serving in production
    - [ ] Add middleware to serve `dist/client` static files
    - [ ] Add catch-all route to serve `index.html` for SPA routing
    - [ ] Ensure this only activates in production (not dev) to avoid conflicts with Vite dev server
- [ ] Task: Write unified build script
    - [ ] Script builds client first: `npm run build -w client`
    - [ ] Then compiles server: `npm run build -w server`
    - [ ] Verify dist/ directory contains both client and server outputs
- [ ] Task: Verify production start command
    - [ ] `npm start` runs compiled server from dist/
    - [ ] Server correctly serves static files on the same port
    - [ ] Socket.IO connections work via the unified port
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Build Integration & Static File Serving' (Protocol in workflow.md)

## Phase 3: Vercel Deployment Configuration

- [ ] Task: Create vercel.json configuration
    - [ ] Define builds for both client and server
    - [ ] Configure rewrites: API/socket routes → server, everything else → client
    - [ ] Set output directory for static files
    - [ ] Configure install/build/start commands
- [ ] Task: Consolidate and document environment variables
    - [ ] List all env vars needed by client (e.g., VITE_API_URL)
    - [ ] List all env vars needed by server (e.g., JWT_SECRET, PORT)
    - [ ] Create .env.example at root with all variables
    - [ ] Update README with deployment instructions
- [ ] Task: Verify serverless compatibility
    - [ ] Ensure Socket.IO works with Vercel (may need @vercel/node adapter or stay on standard Node runtime)
    - [ ] Check that express app initialization fits serverless constraints
    - [ ] Document any Vercel-specific limitations (e.g., WebSocket support)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Vercel Deployment Configuration' (Protocol in workflow.md)

## Phase 4: End-to-End Verification & Cleanup

- [ ] Task: Run full unified build test
    - [ ] Execute `npm run build` from root
    - [ ] Verify dist/ structure is correct
    - [ ] Run `npm start` and verify application loads in browser
    - [ ] Verify all chat features work (login, rooms, messages, typing, reactions)
- [ ] Task: Run unified dev workflow test
    - [ ] Execute `npm run dev` from root
    - [ ] Verify both servers start concurrently
    - [ ] Verify client can connect to server in dev mode
    - [ ] Verify hot reload works for client code
- [ ] Task: Update documentation
    - [ ] Update README.md with new unified commands
    - [ ] Add Vercel deployment section to README
    - [ ] Update conductor/tech-stack.md if architecture changed
    - [ ] Add any new dependencies to conductor/tech-stack.md
- [ ] Task: Final cleanup and commit
    - [ ] Remove any temporary files or debug logs
    - [ ] Ensure no broken imports or references
    - [ ] Run linting across both workspaces
    - [ ] Stage all changes and commit with proper message
- [ ] Task: Conductor - User Manual Verification 'Phase 4: End-to-End Verification & Cleanup' (Protocol in workflow.md)
