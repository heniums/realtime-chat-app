import type { Server, Socket } from "socket.io";

/**
 * Live presence helpers over the Socket.IO server.
 *
 * We do NOT maintain our own socketId → user map. Socket.IO already tracks
 * every connected socket in `io.sockets.sockets`, and every socket carries
 * its authenticated identity on `socket.data.userId` / `socket.data.username`
 * (set by `middleware/auth.ts`). Socket.IO also maintains `socket.rooms`
 * (the rooms each socket is in).
 *
 * This module provides:
 *   • `getOnlineInRoom` — who is online in a room, right now
 *   • `findSocketByUserId` — used by the auth middleware to kick a stale
 *     socket when the same user reconnects from a new socket
 *   • Two small grace-timer maps for:
 *       – 30s per-user disconnect grace (keeps username "claimed")
 *       – 5s per-room empty-broadcast debounce
 *
 * The timer maps are the only state we own. Everything else is derived.
 */

export interface LiveUser {
  userId: string;
  username: string;
}

const USER_DISCONNECT_GRACE_MS = 30_000;
const ROOM_EMPTY_GRACE_MS = 5_000;

const userRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>();
const roomEmptyTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ─── Presence queries ────────────────────────────────────────────────────────

/**
 * Return `{ userId, username }` for every socket currently in the given room.
 * Dedupes by userId so a user with multiple tabs only appears once.
 */
export async function getOnlineInRoom(
  io: Server,
  roomId: string,
): Promise<LiveUser[]> {
  const sockets = await io.in(roomId).fetchSockets();
  const seen = new Map<string, LiveUser>();
  for (const s of sockets) {
    const userId = s.data.userId as string | undefined;
    const username = s.data.username as string | undefined;
    if (!userId || !username) continue;
    if (!seen.has(userId)) seen.set(userId, { userId, username });
  }
  return Array.from(seen.values());
}

/**
 * Find a connected socket belonging to the given userId. Returns the first
 * match (there should be at most one after we kick duplicates).
 */
export async function findSocketByUserId(
  io: Server,
  userId: string,
): Promise<Socket | undefined> {
  // `io.fetchSockets()` returns RemoteSocket[], which works for disconnect()
  // but not for subscribing to events. We only need it for reconnect kick.
  const sockets = await io.fetchSockets();
  const match = sockets.find((s) => s.data.userId === userId);
  // Cast is safe: on a single-server setup RemoteSocket is structurally Socket.
  return match as unknown as Socket | undefined;
}

// ─── Grace timers ────────────────────────────────────────────────────────────

/**
 * Schedule a cleanup callback 30s after a user disconnects. The cleanup
 * should emit the final "user left" broadcasts. If the user reconnects
 * within the window, call `cancelUserRemoval(userId)` to abort.
 */
export function scheduleUserRemoval(
  userId: string,
  cleanup: () => void,
): void {
  cancelUserRemoval(userId);
  const timer = setTimeout(() => {
    userRemovalTimers.delete(userId);
    cleanup();
  }, USER_DISCONNECT_GRACE_MS);
  userRemovalTimers.set(userId, timer);
}

/**
 * Cancel a pending user-removal timer. Returns true if one was cancelled
 * (i.e. the user reconnected in time).
 */
export function cancelUserRemoval(userId: string): boolean {
  const timer = userRemovalTimers.get(userId);
  if (!timer) return false;
  clearTimeout(timer);
  userRemovalTimers.delete(userId);
  return true;
}

/**
 * Debounce "room is empty" broadcasts by 5s. Prevents StrictMode double-
 * invoke and brief reconnects from flickering the room list. The callback
 * should re-check emptiness itself — state may have changed during the wait.
 */
export function scheduleRoomEmptyBroadcast(
  roomId: string,
  broadcast: () => void,
): void {
  if (roomEmptyTimers.has(roomId)) return;
  const timer = setTimeout(() => {
    roomEmptyTimers.delete(roomId);
    broadcast();
  }, ROOM_EMPTY_GRACE_MS);
  roomEmptyTimers.set(roomId, timer);
}

export function cancelRoomEmptyBroadcast(roomId: string): void {
  const timer = roomEmptyTimers.get(roomId);
  if (!timer) return;
  clearTimeout(timer);
  roomEmptyTimers.delete(roomId);
}
