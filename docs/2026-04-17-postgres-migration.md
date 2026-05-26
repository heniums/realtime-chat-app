# PostgreSQL Migration Plan

**Date:** 2026-04-17  
**Status:** In Progress — DB layer complete, socket handlers pending migration  
**Last Updated:** 2026-05-07
**Scope:** Migrate in-memory `Map`-based store (`server/src/store/index.ts`) to PostgreSQL via Neon Serverless Postgres.

---

## Motivation

All application state (users, rooms, messages, reactions) lives in server memory and is lost on every restart. Migrating to PostgreSQL provides:

- **Persistence** — chat history survives restarts and deployments
- **Scalability** — multiple server instances can share state (horizontal scaling with Socket.IO adapter)
- **Query power** — efficient filtering, pagination, full-text search on messages
- **Data integrity** — foreign keys, constraints, transactions

---

## Current In-Memory Store

**File:** `server/src/store/index.ts` (298 lines, ~20 exported functions)

**Data structures:**

- `users` — `Map<string, User>` — socketId → User (id, username, rooms[], status)
- `rooms` — `Map<string, Room>` — roomId → Room (id, name, createdAt, userIds[])
- `messages` — `Map<string, Message[]>` — roomId → Message[] (capped at 50)
- `typing` — `Map<string, Set<string>>` — roomId → Set of typing userIds

**Behaviors to preserve:**

- Room deletion grace period (5s after last user leaves)
- User disconnect grace period (30s before removal)
- User transfer on reconnect (old socketId → new socketId)
- Message history cap (currently 50 per room)
- Reaction cap (20 unique emojis per message)

---

## Database Schema

### `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- bcrypt hash
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Key changes:**
- User identity is decoupled from socket ID. Users get a persistent UUID.
- Users register with a password (bcrypt-hashed). The current anonymous username flow becomes a registration/login flow.
- `socket_id` and `status` are NOT stored in the DB — they are ephemeral real-time state managed in-memory (see "What Stays In-Memory" below).

### `rooms`

```sql
CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `room_members` (join table)

```sql
CREATE TABLE room_members (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);
```

Replaces both `room.userIds[]` and `user.rooms[]`.

### `messages`

```sql
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  username   TEXT NOT NULL,             -- denormalized for display
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_room_id ON messages(room_id, created_at DESC);
```

### `reactions`

```sql
CREATE TABLE reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (message_id, emoji, user_id)
);

CREATE INDEX idx_reactions_message_id ON reactions(message_id);
```

Normalized: one row per user-emoji-message (replaces the `userIds[]` array inside each Reaction).

---

## What Stays In-Memory

Not everything belongs in the database:

- **Typing indicators** — ephemeral, high-frequency, no persistence value → keep in `Map<string, Set<string>>`
- **Online/offline status** — derived from socket connections, changes constantly → keep in `Map<userId, UserStatus>`
- **Socket-to-user mapping** — fast lookup needed per event → `Map<socketId, userId>` and reverse `Map<userId, socketId>`
- **Room deletion timers** — server-local scheduling → keep as `setTimeout`
- **User disconnect timers** — server-local scheduling → keep as `setTimeout`

---

## Tech Stack Choices

- **Database:** Neon Serverless Postgres (initial host — plan is vendor-agnostic)
- **Driver:** `pg` (node-postgres) — standard, works with any Postgres provider. Avoids vendor lock-in to Neon's proprietary driver. If we migrate to AWS RDS, Supabase, or self-hosted Postgres, zero driver changes needed.
- **Query approach:** Raw SQL with `pg` — no ORM

### Why No ORM

We considered Drizzle ORM but decided against it for this project:

- **Pros of an ORM:** type-safe queries, auto-generated migrations, less boilerplate for CRUD
- **Cons for our case:**
  - Extra dependency and abstraction layer for a small schema (5 tables)
  - Our queries are straightforward (inserts, joins, filters) — no complex query composition
  - Raw SQL is more transparent and easier to debug
  - One fewer build/config tool (no `drizzle-kit`)
  - Team stays fluent in SQL rather than learning ORM-specific DSL

We'll use a thin helper layer (`server/src/db/queries/*.ts`) with parameterized SQL to keep things organized and injection-safe. If the schema grows significantly, we can revisit adding an ORM later.

### Dependencies to Add

```
pg bcrypt
```

Dev dependencies:

```
@types/pg @types/bcrypt
```

---

## Implementation Phases

### Phase 1: Setup & Schema ✅ COMPLETE

- [x] Provision Neon project + database
- [x] Add dependencies (`pg`, `@types/pg`, `bcrypt`, `@types/bcrypt`)
- [x] Create `server/src/db/index.ts` — pg Pool connection
- [x] Create `server/src/db/migrate.ts` — migration runner (applies `.sql` files in order)
- [x] Create `server/src/db/migrations/001_initial.sql` — all tables (users, rooms, room_members, messages, reactions)
- [x] Add `DATABASE_URL` to `.env`
- [x] Run initial migration

### Phase 2: Authentication ✅ COMPLETE

- [x] Create `server/src/auth/password.ts` — bcrypt hash/verify helpers
- [x] Add REST endpoints: `POST /auth/register` (create user with hashed password) and `POST /auth/login` (verify password, return JWT)
- [x] Update JWT payload to include persistent DB user ID (`{ userId: UUID, username: string }`)
- [x] Update Socket.IO auth middleware to validate JWT and resolve DB user (instead of accepting raw username)
- [x] Store JWT in an `httpOnly` cookie (set by server on login/register response)
- [x] Auto-reconnect: Socket.IO client sends the cookie automatically; server middleware extracts and validates JWT from the cookie

**Note:** Client still uses old socket-based auth flow — needs update to use REST endpoints (see Phase 5)

### Phase 3: Data Access Layer ✅ COMPLETE

- [x] Create `server/src/db/queries/users.ts` — findByUsername, createUser, getUserById
- [x] Create `server/src/db/queries/rooms.ts` — create, findByName, list, addMember, removeMember, getUsersInRoom, deleteRoom
- [x] Create `server/src/db/queries/messages.ts` — create, getByRoom (with pagination), getById
- [x] Create `server/src/db/queries/reactions.ts` — addReaction, removeReaction, getReactionsForMessage
- [x] Create `server/src/db/queries/mappers.ts` — data mapping helpers between DB rows and app types
- [x] Create `server/src/socket/live-users.ts` — in-memory tracking for online users (ephemeral state)
- [x] Create `server/src/socket/typing.ts` — in-memory typing indicators (ephemeral state)

### Phase 4: Socket Handler Migration 🚧 IN PROGRESS

- [x] Update auth handler — emits authenticated user info via socket.data (migrated)
- [x] Preserve typing indicator logic in-memory (no DB) — `socket/typing.ts` created
- [x] User connect/disconnect flow — `socket/live-users.ts` manages ephemeral state
- [ ] **PENDING:** Update `server/src/socket/handlers/room.ts` — still uses old store
- [ ] **PENDING:** Update `server/src/socket/handlers/message.ts` — still uses old store
- [ ] **PENDING:** Update `server/src/socket/handlers/reaction.ts` — still uses old store

**Blocker:** Socket handlers still import from `../../store` and use Map-based functions instead of DB queries

### Phase 5: Client Adjustments 🚧 IN PROGRESS

- [x] Add login page with React Router — `pages/Login.tsx` and `App.tsx` routing created
- [x] Create AuthContext — `context/AuthContext.tsx` with sessionStorage persistence
- [x] Create useSocket hook — manages socket lifecycle tied to auth state
- [ ] **PENDING:** Update Login.tsx to use REST endpoints (`/auth/login`, `/auth/register`) instead of socket events
- [ ] **PENDING:** Add password field to login form and create register UI
- [ ] **PENDING:** Update Socket.IO connection to use JWT from httpOnly cookie (not token in auth object)
- [ ] **PENDING:** Update shared types — User ID is now UUID (not socket ID)
- [ ] **PENDING:** Add message pagination (load older messages on scroll)

**Blocker:** Client still uses old socket-based auth flow (`socketLogin()` emitting `AUTH_LOGIN`) but server now expects REST-based auth with JWT cookies

### Phase 6: Cleanup & Testing ⏳ NOT STARTED

- [ ] Remove old `server/src/store/index.ts` (or keep typing-only subset)
- [ ] Add error handling for DB failures (graceful fallback / retry)
- [ ] Test register → login → reconnect flow
- [ ] Test room lifecycle (create → join → leave → empty → delete)
- [ ] Test message + reaction CRUD
- [ ] Test invalid/expired JWT rejection
- [ ] Load test with concurrent connections

---

## Migration Risks & Mitigations

- **Latency increase** — DB calls add latency vs in-memory Maps. Mitigation: Neon serverless is low-latency; batch queries where possible; keep hot-path data (typing, socket map) in memory.
- **Connection limits** — Neon free tier has connection limits. Mitigation: use `pg` Pool with a reasonable `max` (e.g. 10); keep hot-path data in memory.
- **Breaking changes to client** — User IDs change from socket IDs to UUIDs; anonymous flow replaced with register/login. Mitigation: Phase 2 builds auth first; Phase 5 updates all client flows together. JWT carries DB user ID.
- **Data loss during transition** — App currently has no persistent data, so there is nothing to migrate. Clean start.

---

## Current Blockers

The following must be resolved to complete the migration:

1. **Socket handlers use old store** — `room.ts`, `message.ts`, `reaction.ts` still import from `../../store` and call Map-based functions instead of DB queries
2. **Client auth flow mismatch** — Login.tsx uses `socketLogin()` which emits `AUTH_LOGIN`, but server now requires REST-based auth via `/auth/login` and `/auth/register` with JWT cookies
3. **No client password field** — Login form only has username; needs password input and register option

## Progress Summary

- **Phase 1:** 100% ✅ (DB setup, schema, migrations complete)
- **Phase 2:** 100% ✅ (Server auth with bcrypt, JWT, httpOnly cookies complete)
- **Phase 3:** 100% ✅ (All DB query modules created)
- **Phase 4:** ~30% 🚧 (Auth migrated, room/message/reaction handlers still use old store)
- **Phase 5:** ~40% 🚧 (Routing, AuthContext, useSocket created; REST auth integration pending)
- **Phase 6:** 0% ⏳ (Cleanup and testing not started)

## Decisions

- **Message retention:** Keep all messages forever. No pruning.
- **Multi-server:** Not needed — single-server is sufficient for a hobby project. No Redis adapter.
