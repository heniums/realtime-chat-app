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
