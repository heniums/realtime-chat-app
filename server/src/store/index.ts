import { User, UserStatus, Room, Message, Reaction, USER_STATUS } from "../types";
import { redis, isRedisEnabled } from "../redis";

// ─── In-Memory Fallback ─────────────────────────────────────────────────────

const memUsers = new Map<string, User>();
const memRooms = new Map<string, Room>();
const memMessages = new Map<string, Message[]>();
const memTyping = new Map<string, Set<string>>();

const MAX_HISTORY = 50;

// ─── Redis Keys ─────────────────────────────────────────────────────────────

const rk = {
  user: (id: string) => `user:${id}`,
  room: (id: string) => `room:${id}`,
  messages: (roomId: string) => `messages:${roomId}`,
  typing: (roomId: string) => `typing:${roomId}`,
  roomList: () => "rooms",
};

// ─── Serialization ──────────────────────────────────────────────────────────

function serializeUser(u: User): string {
  return JSON.stringify({ ...u, status: u.status });
}

function deserializeUser(s: string | null): User | undefined {
  if (!s) return undefined;
  return JSON.parse(s) as User;
}

function serializeRoom(r: Room): string {
  return JSON.stringify({ ...r, createdAt: r.createdAt.toISOString() });
}

function deserializeRoom(s: string | null): Room | undefined {
  if (!s) return undefined;
  const obj = JSON.parse(s);
  obj.createdAt = new Date(obj.createdAt);
  return obj as Room;
}

function serializeMessage(m: Message): string {
  return JSON.stringify({ ...m, timestamp: m.timestamp.toISOString() });
}

function deserializeMessage(s: string): Message {
  const obj = JSON.parse(s);
  obj.timestamp = new Date(obj.timestamp);
  return obj as Message;
}

// ─── User Operations ────────────────────────────────────────────────────────

export async function addUser(socketId: string, username: string): Promise<User> {
  const user: User = {
    id: socketId,
    username,
    rooms: [],
    status: USER_STATUS.ONLINE,
  };
  if (isRedisEnabled() && redis) {
    await redis.set(rk.user(socketId), serializeUser(user));
  } else {
    memUsers.set(socketId, user);
  }
  return user;
}

export async function getUser(socketId: string): Promise<User | undefined> {
  if (isRedisEnabled() && redis) {
    const data = await redis.get(rk.user(socketId));
    return deserializeUser(data);
  }
  return memUsers.get(socketId);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  if (isRedisEnabled() && redis) {
    // Scan all user keys (inefficient but acceptable for hobby scale)
    const keys = await redis.keys("user:*");
    for (const key of keys) {
      const data = await redis.get(key);
      const user = deserializeUser(data);
      if (user?.username === username) return user;
    }
    return undefined;
  }
  for (const user of memUsers.values()) {
    if (user.username === username) return user;
  }
  return undefined;
}

export async function removeUser(socketId: string): Promise<User | undefined> {
  if (isRedisEnabled() && redis) {
    const data = await redis.get(rk.user(socketId));
    const user = deserializeUser(data);
    if (user) await redis.del(rk.user(socketId));
    return user;
  }
  const user = memUsers.get(socketId);
  memUsers.delete(socketId);
  return user;
}

export async function transferUser(
  oldSocketId: string,
  newSocketId: string,
  username: string,
): Promise<User> {
  const oldUser = await getUser(oldSocketId);
  const preservedRooms = oldUser?.rooms ?? [];

  // Update room userIds
  for (const roomId of preservedRooms) {
    const room = await getRoom(roomId);
    if (room) {
      const idx = room.userIds.indexOf(oldSocketId);
      if (idx !== -1) {
        room.userIds[idx] = newSocketId;
        await updateRoom(room);
      }
    }
  }

  await removeUser(oldSocketId);
  const user: User = {
    id: newSocketId,
    username,
    rooms: preservedRooms,
    status: USER_STATUS.ONLINE,
  };

  if (isRedisEnabled() && redis) {
    await redis.set(rk.user(newSocketId), serializeUser(user));
  } else {
    memUsers.set(newSocketId, user);
  }
  return user;
}

export async function setUserStatus(
  socketId: string,
  status: UserStatus,
): Promise<User | undefined> {
  const user = await getUser(socketId);
  if (user) {
    user.status = status;
    if (isRedisEnabled() && redis) {
      await redis.set(rk.user(socketId), serializeUser(user));
    }
  }
  return user;
}

// ─── Room Operations ────────────────────────────────────────────────────────

export async function createRoom(name: string): Promise<Room> {
  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const room: Room = { id, name, createdAt: new Date(), userIds: [] };
  if (isRedisEnabled() && redis) {
    await redis.set(rk.room(id), serializeRoom(room));
    await redis.sadd(rk.roomList(), id);
  } else {
    memRooms.set(id, room);
    memMessages.set(id, []);
  }
  return room;
}

export async function getRoom(roomId: string): Promise<Room | undefined> {
  if (isRedisEnabled() && redis) {
    const data = await redis.get(rk.room(roomId));
    return deserializeRoom(data);
  }
  return memRooms.get(roomId);
}

export async function getRoomByName(name: string): Promise<Room | undefined> {
  const rooms = await listRooms();
  return rooms.find((r) => r.name === name);
}

export async function listRooms(): Promise<Room[]> {
  if (isRedisEnabled() && redis) {
    const ids = await redis.smembers(rk.roomList());
    const rooms: Room[] = [];
    for (const id of ids) {
      const room = await getRoom(id);
      if (room) rooms.push(room);
    }
    return rooms;
  }
  return Array.from(memRooms.values());
}

export async function updateRoom(room: Room): Promise<void> {
  if (isRedisEnabled() && redis) {
    await redis.set(rk.room(room.id), serializeRoom(room));
  } else {
    memRooms.set(room.id, room);
  }
}

export async function addUserToRoom(roomId: string, userId: string): Promise<void> {
  const room = await getRoom(roomId);
  const user = await getUser(userId);
  if (!room || !user) return;

  if (!room.userIds.includes(userId)) {
    room.userIds.push(userId);
    await updateRoom(room);
  }
  if (!user.rooms.includes(roomId)) {
    user.rooms.push(roomId);
    if (isRedisEnabled() && redis) {
      await redis.set(rk.user(userId), serializeUser(user));
    }
  }
}

export async function removeUserFromRoom(roomId: string, userId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (room) {
    room.userIds = room.userIds.filter((id) => id !== userId);
    await updateRoom(room);
  }

  const user = await getUser(userId);
  if (user) {
    user.rooms = user.rooms.filter((id) => id !== roomId);
    if (isRedisEnabled() && redis) {
      await redis.set(rk.user(userId), serializeUser(user));
    }
  }

  // Clear typing
  if (isRedisEnabled() && redis) {
    await redis.srem(rk.typing(roomId), userId);
  } else {
    const typingSet = memTyping.get(roomId);
    if (typingSet) typingSet.delete(userId);
  }
}

export async function getUsersInRoom(roomId: string): Promise<User[]> {
  const room = await getRoom(roomId);
  if (!room) return [];

  const users: User[] = [];
  for (const id of room.userIds) {
    const user = await getUser(id);
    if (user) users.push(user);
  }
  return users;
}

// ─── Message Operations ─────────────────────────────────────────────────────

export async function addMessage(msg: Omit<Message, "reactions">): Promise<void> {
  const message: Message = { ...msg, reactions: [] };
  if (isRedisEnabled() && redis) {
    await redis.lpush(rk.messages(msg.roomId), serializeMessage(message));
    await redis.ltrim(rk.messages(msg.roomId), 0, MAX_HISTORY - 1);
  } else {
    const history = memMessages.get(msg.roomId) ?? [];
    history.push(message);
    if (history.length > MAX_HISTORY) history.shift();
    memMessages.set(msg.roomId, history);
  }
}

export async function getMessages(roomId: string): Promise<Message[]> {
  if (isRedisEnabled() && redis) {
    const data = await redis.lrange(rk.messages(roomId), 0, -1);
    return data.map(deserializeMessage).reverse(); // lrange returns newest-first, reverse to oldest-first
  }
  return memMessages.get(roomId) ?? [];
}

// ─── Typing Operations ──────────────────────────────────────────────────────

export async function setTyping(
  roomId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> {
  if (isRedisEnabled() && redis) {
    if (isTyping) {
      await redis.sadd(rk.typing(roomId), userId);
    } else {
      await redis.srem(rk.typing(roomId), userId);
    }
  } else {
    if (!memTyping.has(roomId)) memTyping.set(roomId, new Set());
    const set = memTyping.get(roomId)!;
    if (isTyping) set.add(userId);
    else set.delete(userId);
  }
}

export async function getTypingUsers(roomId: string): Promise<string[]> {
  if (isRedisEnabled() && redis) {
    return await redis.smembers(rk.typing(roomId));
  }
  return Array.from(memTyping.get(roomId) ?? []);
}

export async function getTypingUsernames(roomId: string): Promise<string[]> {
  const userIds = await getTypingUsers(roomId);
  const users = await getUsersInRoom(roomId);
  return userIds
    .map((id) => users.find((u) => u.id === id)?.username)
    .filter((name): name is string => name !== undefined);
}

// ─── Reaction Operations ────────────────────────────────────────────────────

const MAX_REACTIONS_PER_MESSAGE = 20;

export async function addReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string,
): Promise<Reaction[] | null> {
  const messages = await getMessages(roomId);
  const msg = messages.find((m) => m.id === messageId);
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

  // Save updated messages back
  if (isRedisEnabled() && redis) {
    await redis.del(rk.messages(roomId));
    for (const m of messages) {
      await redis.rpush(rk.messages(roomId), serializeMessage(m));
    }
  }

  return msg.reactions;
}

export async function removeReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string,
): Promise<Reaction[] | null> {
  const messages = await getMessages(roomId);
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) return null;

  const existing = msg.reactions.find((r) => r.emoji === emoji);
  if (!existing) return msg.reactions;

  existing.userIds = existing.userIds.filter((id) => id !== userId);
  if (existing.userIds.length === 0) {
    msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
  }

  // Save updated messages back
  if (isRedisEnabled() && redis) {
    await redis.del(rk.messages(roomId));
    for (const m of messages) {
      await redis.rpush(rk.messages(roomId), serializeMessage(m));
    }
  }

  return msg.reactions;
}
