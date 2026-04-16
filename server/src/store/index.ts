import { User, UserStatus, Room, Message, Reaction, USER_STATUS } from "../types";

// ─── Store Shape ─────────────────────────────────────────────────────────────

const users = new Map<string, User>(); // socketId → User
const rooms = new Map<string, Room>(); // roomId → Room
const messages = new Map<string, Message[]>(); // roomId → Message[]
const typing = new Map<string, Set<string>>(); // roomId → Set<userId>

// Grace period before deleting an empty room (ms).
// Prevents StrictMode double-invoke and brief reconnects from destroying rooms.
const ROOM_DELETE_GRACE_MS = 5_000;
const roomDeletionTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Grace period before removing a disconnected user (ms).
// Keeps the username reserved so a reconnecting client (page reload, brief
// network drop) can reclaim it within this window.
const USER_DISCONNECT_GRACE_MS = 30_000;
const userDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

const MAX_HISTORY = 50;

// ─── User Operations ──────────────────────────────────────────────────────────

export function addUser(socketId: string, username: string): User {
  const user: User = {
    id: socketId,
    username,
    rooms: [],
    status: USER_STATUS.ONLINE,
  };
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

/**
 * Schedule a user for removal after the grace period.
 * The cleanup callback handles the actual removeUser call (which needs the
 * correct socketId captured at disconnect time).
 */
export function scheduleUserRemoval(
  username: string,
  cleanup: () => void,
): void {
  // Cancel any existing timer for this username (shouldn't happen, but be safe)
  cancelUserRemoval(username);

  const timer = setTimeout(() => {
    userDisconnectTimers.delete(username);
    cleanup();
  }, USER_DISCONNECT_GRACE_MS);

  userDisconnectTimers.set(username, timer);
}

/**
 * Cancel a pending user removal. Returns true if a timer was cancelled
 * (meaning the user reconnected within the grace window).
 */
export function cancelUserRemoval(username: string): boolean {
  const timer = userDisconnectTimers.get(username);
  if (timer) {
    clearTimeout(timer);
    userDisconnectTimers.delete(username);
    return true;
  }
  return false;
}

/**
 * Transfer a reconnecting user from the old socket ID to the new one.
 * Preserves room memberships so the user stays visible in rooms they were in.
 * Also updates the room userIds arrays to reference the new socket ID.
 */
export function transferUser(
  oldSocketId: string,
  newSocketId: string,
  username: string,
): User {
  const oldUser = users.get(oldSocketId);
  const preservedRooms = oldUser?.rooms ?? [];

  // Update room userIds to reference the new socket ID
  for (const roomId of preservedRooms) {
    const room = rooms.get(roomId);
    if (room) {
      const idx = room.userIds.indexOf(oldSocketId);
      if (idx !== -1) room.userIds[idx] = newSocketId;
    }
  }

  users.delete(oldSocketId);
  const user: User = {
    id: newSocketId,
    username,
    rooms: preservedRooms,
    status: USER_STATUS.ONLINE,
  };
  users.set(newSocketId, user);
  return user;
}

/**
 * Update a user's online/offline status.
 */
export function setUserStatus(
  socketId: string,
  status: UserStatus,
): User | undefined {
  const user = users.get(socketId);
  if (user) user.status = status;
  return user;
}

// ─── Room Operations ──────────────────────────────────────────────────────────

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
  const user = users.get(userId);
  if (!room || !user) return;

  // Cancel any pending deletion timer — the room is active again.
  const timer = roomDeletionTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomDeletionTimers.delete(roomId);
  }

  if (!room.userIds.includes(userId)) room.userIds.push(userId);
  if (!user.rooms.includes(roomId)) user.rooms.push(roomId);
}

export function removeUserFromRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.userIds = room.userIds.filter((id) => id !== userId);
    if (room.userIds.length === 0) {
      // Schedule deletion after the grace period instead of deleting immediately.
      // This prevents StrictMode's mount→unmount→remount cycle from destroying
      // a room that the client is about to rejoin.
      if (!roomDeletionTimers.has(roomId)) {
        const timer = setTimeout(() => {
          // Re-check: another user may have joined during the grace period.
          const r = rooms.get(roomId);
          if (r && r.userIds.length === 0) {
            rooms.delete(roomId);
            messages.delete(roomId);
            typing.delete(roomId);
          }
          roomDeletionTimers.delete(roomId);
        }, ROOM_DELETE_GRACE_MS);
        roomDeletionTimers.set(roomId, timer);
      }
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

export function addMessage(msg: Omit<Message, "reactions">): void {
  const history = messages.get(msg.roomId) ?? [];
  history.push({ ...msg, reactions: [] });
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

export function getTypingUsernames(roomId: string): string[] {
  return getTypingUsers(roomId)
    .map((id) => getUsersInRoom(roomId).find((u) => u.id === id)?.username)
    .filter((name): name is string => name !== undefined);
}

// ─── Reaction Operations ──────────────────────────────────────────────────────

const MAX_REACTIONS_PER_MESSAGE = 20;

function findMessage(roomId: string, messageId: string): Message | undefined {
  return getMessages(roomId).find((m) => m.id === messageId);
}

export function addReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string,
): Reaction[] | null {
  const msg = findMessage(roomId, messageId);
  if (!msg) return null;

  const existing = msg.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    if (!existing.userIds.includes(userId)) {
      existing.userIds.push(userId);
    }
  } else {
    if (msg.reactions.length >= MAX_REACTIONS_PER_MESSAGE) return null;
    msg.reactions.push({ emoji, userIds: [userId] });
  }
  return msg.reactions;
}

export function removeReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string,
): Reaction[] | null {
  const msg = findMessage(roomId, messageId);
  if (!msg) return null;

  const existing = msg.reactions.find((r) => r.emoji === emoji);
  if (!existing) return msg.reactions;

  existing.userIds = existing.userIds.filter((id) => id !== userId);
  if (existing.userIds.length === 0) {
    msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
  }
  return msg.reactions;
}
