// Mirror of server/src/types/index.ts — keep in sync.
// Single source of truth for all socket event name strings used in the client.

export const EVENTS = {
  // Client → Server
  AUTH_LOGIN: 'auth:login',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_LIST: 'room:list',
  MESSAGE_SEND: 'message:send',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Server → Client
  AUTH_TOKEN: 'auth:token',
  AUTH_ERROR: 'auth:error',
  ROOM_CREATED: 'room:created',
  ROOM_LIST_RESPONSE: 'room:listed',
  ROOM_USERS: 'room:users',
  ROOM_ERROR: 'room:error',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_HISTORY: 'message:history',
  MESSAGE_ERROR: 'message:error',
  TYPING_UPDATE: 'typing:update',

  // Socket.IO built-in events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
} as const;

export type EventValue = (typeof EVENTS)[keyof typeof EVENTS];

// Mirror of server/src/types/index.ts — keep in sync.
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
