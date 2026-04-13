import { User, Room, Message } from "../types";

// ─── Store Shape ─────────────────────────────────────────────────────────────

const users = new Map<string, User>(); // socketId → User
const rooms = new Map<string, Room>(); // roomId → Room
const messages = new Map<string, Message[]>(); // roomId → Message[]
const typing = new Map<string, Set<string>>(); // roomId → Set<userId>

const MAX_HISTORY = 50;

// ─── User Operations ──────────────────────────────────────────────────────────

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

  if (!room.userIds.includes(userId)) room.userIds.push(userId);
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
