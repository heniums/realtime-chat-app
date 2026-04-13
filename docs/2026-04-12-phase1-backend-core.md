# Phase 1 — Backend Core Implementation Plan

**Goal:** A working Socket.io server with auth, rooms, messaging, typing indicators, and online presence — no UI yet, testable via a WebSocket client.

**Architecture:** Express HTTP server with Socket.io attached. All state lives in a single in-memory store (Maps). Handlers are split by domain (auth, room, message). JWT middleware verifies every authenticated socket event.

**Tech Stack:** Node.js 20 LTS, Express 4, Socket.io 4, jsonwebtoken, TypeScript 5, ts-node-dev, dotenv

---

## File Map

```
server/
├── src/
│   ├── index.ts                    # Entry point — HTTP + Socket.io
│   ├── types/
│   │   └── index.ts                # Event constants, User, Room, Message interfaces
│   ├── store/
│   │   └── index.ts                # In-memory store + store operations
│   ├── socket/
│   │   ├── index.ts                # Socket.io init, middleware, handler wiring
│   │   └── handlers/
│   │       ├── auth.ts             # auth:login → JWT, socket user association
│   │       ├── room.ts             # room:create/join/leave/list
│   │       └── message.ts         # message:send, typing:start/stop
│   └── middleware/
│       └── auth.ts                 # JWT verify middleware for socket connections
├── package.json
├── tsconfig.json
└── .env
```

---

## Task 1: Project Scaffold

**Files:**

- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`

- [ ] **Step 1: Init npm project**

```bash
cd server && npm init -y
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install express socket.io jsonwebtoken dotenv cors
npm install --save-dev typescript ts-node-dev @types/node @types/express @types/jsonwebtoken @types/cors
```

- [ ] **Step 3: Add scripts to package.json**

Edit `server/package.json` scripts section:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Write .env**

```
PORT=3001
JWT_SECRET=dev_secret_change_in_production
CLIENT_ORIGIN=http://localhost:5173
```

---

## Task 2: Types + Event Constants

**Files:**

- Create: `server/src/types/index.ts`

- [ ] **Step 1: Write types file**

```typescript
// ─── Socket Event Constants ───────────────────────────────────────────────────

export const EVENTS = {
  // Client → Server
  AUTH_LOGIN: "auth:login",
  ROOM_CREATE: "room:create",
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_LIST: "room:list",
  MESSAGE_SEND: "message:send",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Server → Client
  AUTH_TOKEN: "auth:token",
  AUTH_ERROR: "auth:error",
  ROOM_CREATED: "room:created",
  ROOM_LIST_RESPONSE: "room:list",
  ROOM_USER_JOINED: "room:user_joined",
  ROOM_USER_LEFT: "room:user_left",
  ROOM_USERS: "room:users",
  ROOM_ERROR: "room:error",
  MESSAGE_RECEIVED: "message:received",
  MESSAGE_HISTORY: "message:history",
  MESSAGE_ERROR: "message:error",
  TYPING_UPDATE: "typing:update",
} as const;

// ─── Data Models ──────────────────────────────────────────────────────────────

export interface User {
  id: string; // socket.id at time of login
  username: string;
  rooms: string[]; // room IDs currently joined
}

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  userIds: string[]; // user IDs currently in room
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  username: string;
}
```

---

## Task 3: In-Memory Store

**Files:**

- Create: `server/src/store/index.ts`

- [ ] **Step 1: Write store module**

```typescript
import { User, Room, Message } from "../types";

// ─── Store Shape ─────────────────────────────────────────────────────────────

const users = new Map<string, User>(); // socketId → User
const rooms = new Map<string, Room>(); // roomId → Room
const messages = new Map<string, Message[]>(); // roomId → Message[]
const typing = new Map<string, Set<string>>(); // roomId → Set<userId>

const MAX_HISTORY = 50;

// ─── User Operations ─────────────────────────────────────────────────────────

export function addUser(socketId: string, username: string): User {
  const user: User = { id: socketId, username, rooms: [] };
  users.set(socketId, user);
  return user;
}

export function getUser(socketId: string): User | undefined {
  return users.get(socketId);
}

export function getUserByUsername(username: string): User | undefined {
  for (const user of users.values()) {
    if (user.username === username) return user;
  }
  return undefined;
}

export function removeUser(socketId: string): User | undefined {
  const user = users.get(socketId);
  users.delete(socketId);
  return user;
}

// ─── Room Operations ─────────────────────────────────────────────────────────

export function createRoom(name: string): Room {
  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const room: Room = { id, name, createdAt: new Date(), userIds: [] };
  rooms.set(id, room);
  messages.set(id, []);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomByName(name: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.name === name) return room;
  }
  return undefined;
}

export function listRooms(): Room[] {
  return Array.from(rooms.values());
}

export function addUserToRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  if (!room.userIds.includes(userId)) room.userIds.push(userId);

  const user = users.get(userId);
  if (!user) return;
  if (!user.rooms.includes(roomId)) user.rooms.push(roomId);
}

export function removeUserFromRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.userIds = room.userIds.filter((id) => id !== userId);
    if (room.userIds.length === 0) {
      rooms.delete(roomId);
      messages.delete(roomId);
      typing.delete(roomId);
    }
  }

  const user = users.get(userId);
  if (user) {
    user.rooms = user.rooms.filter((id) => id !== roomId);
  }

  // Clear typing
  const typingSet = typing.get(roomId);
  if (typingSet) typingSet.delete(userId);
}

export function getUsersInRoom(roomId: string): User[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.userIds
    .map((id) => users.get(id))
    .filter((u): u is User => u !== undefined);
}

// ─── Message Operations ───────────────────────────────────────────────────────

export function addMessage(msg: Message): void {
  const history = messages.get(msg.roomId) ?? [];
  history.push(msg);
  if (history.length > MAX_HISTORY) history.shift();
  messages.set(msg.roomId, history);
}

export function getMessages(roomId: string): Message[] {
  return messages.get(roomId) ?? [];
}

// ─── Typing Operations ────────────────────────────────────────────────────────

export function setTyping(
  roomId: string,
  userId: string,
  isTyping: boolean,
): void {
  if (!typing.has(roomId)) typing.set(roomId, new Set());
  const set = typing.get(roomId)!;
  if (isTyping) set.add(userId);
  else set.delete(userId);
}

export function getTypingUsers(roomId: string): string[] {
  return Array.from(typing.get(roomId) ?? []);
}
```

---

## Task 4: Auth Handler

**Files:**

- Create: `server/src/socket/handlers/auth.ts`

- [ ] **Step 1: Write auth handler**

```typescript
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { EVENTS, JwtPayload } from "../../types";
import { addUser, getUserByUsername } from "../../store";

export function registerAuthHandlers(socket: Socket): void {
  socket.on(EVENTS.AUTH_LOGIN, ({ username }: { username: string }) => {
    if (!username || typeof username !== "string" || !username.trim()) {
      socket.emit(EVENTS.AUTH_ERROR, { message: "Username is required" });
      return;
    }

    const trimmed = username.trim();

    if (getUserByUsername(trimmed)) {
      socket.emit(EVENTS.AUTH_ERROR, { message: "Username already taken" });
      return;
    }

    const user = addUser(socket.id, trimmed);
    const payload: JwtPayload = { userId: user.id, username: user.username };
    const secret = process.env.JWT_SECRET ?? "fallback_secret";
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });

    socket.emit(EVENTS.AUTH_TOKEN, { token, userId: user.id });
  });
}
```

---

## Task 5: Room Handler

**Files:**

- Create: `server/src/socket/handlers/room.ts`

- [ ] **Step 1: Write room handler**

```typescript
import { Socket, Server } from "socket.io";
import { EVENTS } from "../../types";
import {
  getUser,
  createRoom,
  getRoom,
  getRoomByName,
  listRooms,
  addUserToRoom,
  removeUserFromRoom,
  getUsersInRoom,
  getMessages,
} from "../../store";

export function registerRoomHandlers(socket: Socket, io: Server): void {
  // ── room:list ──────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_LIST, () => {
    socket.emit(EVENTS.ROOM_LIST_RESPONSE, listRooms());
  });

  // ── room:create ────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_CREATE, ({ name }: { name: string }) => {
    if (!name || !name.trim()) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room name is required" });
      return;
    }
    if (getRoomByName(name.trim())) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room name already exists" });
      return;
    }
    const room = createRoom(name.trim());
    io.emit(EVENTS.ROOM_CREATED, room); // broadcast to all clients
  });

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_JOIN, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    const room = getRoom(roomId);

    if (!user) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Not authenticated" });
      return;
    }
    if (!room) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    addUserToRoom(roomId, socket.id);

    // Send history to the joining user
    socket.emit(EVENTS.MESSAGE_HISTORY, getMessages(roomId));

    // Notify others in room
    socket.to(roomId).emit(EVENTS.ROOM_USER_JOINED, { roomId, user });

    // Send updated user list to everyone in room
    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: getUsersInRoom(roomId),
    });
  });

  // ── room:leave ─────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_LEAVE, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.leave(roomId);
    removeUserFromRoom(roomId, socket.id);

    socket
      .to(roomId)
      .emit(EVENTS.ROOM_USER_LEFT, { roomId, userId: socket.id });
    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: getUsersInRoom(roomId),
    });
  });
}
```

---

## Task 6: Message + Typing Handler

**Files:**

- Create: `server/src/socket/handlers/message.ts`

- [ ] **Step 1: Write message/typing handler**

```typescript
import { Socket, Server } from "socket.io";
import { EVENTS, Message } from "../../types";
import {
  getUser,
  getRoom,
  addMessage,
  setTyping,
  getTypingUsers,
  getUsersInRoom,
} from "../../store";

const MAX_MESSAGE_LENGTH = 1000;

export function registerMessageHandlers(socket: Socket, io: Server): void {
  // ── message:send ───────────────────────────────────────────────────────────
  socket.on(
    EVENTS.MESSAGE_SEND,
    ({ roomId, text }: { roomId: string; text: string }) => {
      const user = getUser(socket.id);
      const room = getRoom(roomId);

      if (!user) {
        socket.emit(EVENTS.MESSAGE_ERROR, { message: "Not authenticated" });
        return;
      }
      if (!room) {
        socket.emit(EVENTS.MESSAGE_ERROR, { message: "Room not found" });
        return;
      }
      if (!user.rooms.includes(roomId)) {
        socket.emit(EVENTS.MESSAGE_ERROR, {
          message: "You are not in this room",
        });
        return;
      }
      if (!text || typeof text !== "string" || !text.trim()) {
        socket.emit(EVENTS.MESSAGE_ERROR, {
          message: "Message cannot be empty",
        });
        return;
      }
      if (text.length > MAX_MESSAGE_LENGTH) {
        socket.emit(EVENTS.MESSAGE_ERROR, {
          message: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit`,
        });
        return;
      }

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        roomId,
        userId: socket.id,
        username: user.username,
        text: text.trim(),
        timestamp: new Date(),
      };

      addMessage(message);
      io.to(roomId).emit(EVENTS.MESSAGE_RECEIVED, message);
    },
  );

  // ── typing:start ───────────────────────────────────────────────────────────
  socket.on(EVENTS.TYPING_START, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user || !user.rooms.includes(roomId)) return;

    setTyping(roomId, socket.id, true);
    socket.to(roomId).emit(EVENTS.TYPING_UPDATE, {
      roomId,
      users: getTypingUsers(roomId)
        .map((id) => getUsersInRoom(roomId).find((u) => u.id === id)?.username)
        .filter(Boolean),
    });
  });

  // ── typing:stop ────────────────────────────────────────────────────────────
  socket.on(EVENTS.TYPING_STOP, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    setTyping(roomId, socket.id, false);
    socket.to(roomId).emit(EVENTS.TYPING_UPDATE, {
      roomId,
      users: getTypingUsers(roomId)
        .map((id) => getUsersInRoom(roomId).find((u) => u.id === id)?.username)
        .filter(Boolean),
    });
  });
}
```

---

## Task 7: Socket Server Init + Disconnect Handler

**Files:**

- Create: `server/src/socket/index.ts`

- [ ] **Step 1: Write socket initializer**

```typescript
import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerAuthHandlers } from "./handlers/auth";
import { registerRoomHandlers } from "./handlers/room";
import { registerMessageHandlers } from "./handlers/message";
import { removeUser, getUser } from "../store";
import { EVENTS } from "../types";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerAuthHandlers(socket);
    registerRoomHandlers(socket, io);
    registerMessageHandlers(socket, io);

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const user = getUser(socket.id);
      if (user) {
        // Leave all rooms and notify members
        for (const roomId of [...user.rooms]) {
          socket
            .to(roomId)
            .emit(EVENTS.ROOM_USER_LEFT, { roomId, userId: socket.id });
          // Import dynamically to avoid circular dep
          const { removeUserFromRoom, getUsersInRoom } = require("../store");
          removeUserFromRoom(roomId, socket.id);
          io.to(roomId).emit(EVENTS.ROOM_USERS, {
            roomId,
            users: getUsersInRoom(roomId),
          });
        }
        removeUser(socket.id);
      }
    });
  });

  return io;
}
```

---

## Task 8: Entry Point

**Files:**

- Modify: `server/src/index.ts`

- [ ] **Step 1: Write entry point**

```typescript
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import { initSocket } from "./socket";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

initSocket(httpServer);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
```

- [ ] **Step 2: Verify server starts**

```bash
npm run dev
```

Expected output:

```
[server] listening on port 3001
```

Then test health check:

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

---

## Done Criteria for Phase 1

- [ ] `npm run dev` starts without TypeScript errors
- [ ] `GET /health` returns 200
- [ ] Two sockets can `auth:login`, exchange messages in a room in real time
- [ ] Online user list updates on join/disconnect
- [ ] Typing indicators broadcast correctly
- [ ] `npm run build` produces `dist/` with no errors
