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
  REACTION_ADD: "reaction:add",
  REACTION_REMOVE: "reaction:remove",

  // Server → Client
  AUTH_TOKEN: "auth:token",
  AUTH_ERROR: "auth:error",
  ROOM_CREATED: "room:created",
  ROOM_LIST_RESPONSE: "room:listed",
  ROOM_USERS: "room:users",
  ROOM_ERROR: "room:error",
  MESSAGE_RECEIVED: "message:received",
  MESSAGE_HISTORY: "message:history",
  MESSAGE_ERROR: "message:error",
  TYPING_UPDATE: "typing:update",
  REACTION_UPDATED: "reaction:updated",

  // Socket.IO built-in events
  CONNECTION: "connection",
  CONNECT: "connect",
  DISCONNECT: "disconnect",
} as const;

export type EventValue = (typeof EVENTS)[keyof typeof EVENTS];

// ─── User Status Constants ────────────────────────────────────────────────────

export const USER_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

// ─── Data Models ──────────────────────────────────────────────────────────────

export interface User {
  id: string; // socket.id at time of login
  username: string;
  rooms: string[]; // room IDs currently joined
  status: UserStatus;
}

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  userIds: string[]; // user IDs currently in room
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  reactions: Reaction[];
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  username: string;
}
