import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { JwtPayload, EVENTS } from "../types";
import { JWT_SECRET } from "../config/env";
import { findUserById } from "../db/queries/users";
import { getUserRooms } from "../db/queries/rooms";
import {
  cancelUserRemoval,
  findSocketByUserId,
  getOnlineInRoom,
} from "../socket/live-users";

const COOKIE_NAME = "token";

/**
 * Socket.IO connection middleware.
 *
 * Reads JWT from:
 *  1. httpOnly cookie (primary — set by REST /auth/login or /auth/register)
 *  2. socket.handshake.auth.token (fallback — for non-browser clients)
 *
 * Verifies the token, confirms the user exists in the DB, attaches
 * { userId, username } to `socket.data`, then:
 *   • If the same user was recently disconnected (grace timer pending),
 *     cancels the removal.
 *   • If the same user is already connected on another socket, disconnects
 *     the older socket — one live session per user.
 *   • Re-joins all DB-recorded rooms for the user so their live presence
 *     is immediately correct.
 *   • Broadcasts ROOM_USERS to each rejoined room so others see them.
 */
export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  // Extract token from cookie or handshake auth
  let token: string | undefined;

  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = cookie.parse(cookieHeader);
    token = cookies[COOKIE_NAME];
  }

  if (!token) {
    token = socket.handshake.auth?.token;
  }

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Verify user still exists in DB
    const dbUser = await findUserById(payload.userId);
    if (!dbUser) {
      return next(new Error("User not found"));
    }

    // Attach authenticated identity to socket.data — the single source of
    // truth for "who is this socket" from here on. Handlers read this,
    // never socket.id, for DB writes.
    socket.data.userId = dbUser.id;
    socket.data.username = dbUser.username;

    // Resolve presence before signaling connected. Doing it after next()
    // would race with the client's first post-connect emit.
    await reattachPresence(socket, dbUser.id, dbUser.username);

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}

/**
 * After the socket has passed auth, reconcile it with live presence:
 *  • Cancel any pending 30s removal timer (reconnect within grace).
 *  • If another socket is still live for the same userId, disconnect it —
 *    single active session per user. Without this, the old socket would
 *    keep receiving events and the new one would double-join rooms.
 *  • Re-join every DB-tracked room so the socket participates in broadcasts.
 *  • Emit ROOM_USERS to each rejoined room so others see the user online.
 */
async function reattachPresence(
  socket: Socket,
  userId: string,
  username: string,
): Promise<void> {
  const io = socket.nsp.server;

  cancelUserRemoval(userId);

  // Kick any stale socket for the same user (different socket.id).
  const existing = await findSocketByUserId(io, userId);
  if (existing && existing.id !== socket.id) {
    console.log(
      `[auth] kicking stale socket for ${username} (${existing.id} → ${socket.id})`,
    );
    existing.disconnect(true);
  }

  // Rejoin all rooms the user belongs to in the DB.
  const rooms = await getUserRooms(userId);
  for (const room of rooms) {
    socket.join(room.id);
  }

  // Broadcast updated online presence to every room the user is in.
  // `socket.to(roomId)` excludes the sender; that's fine — the sender can
  // request ROOM_LIST or get history on ROOM_JOIN to see their own state.
  for (const room of rooms) {
    const online = await getOnlineInRoom(io, room.id);
    socket.to(room.id).emit(EVENTS.ROOM_USERS, {
      roomId: room.id,
      users: online.map((u) => ({
        id: u.userId,
        username: u.username,
        status: "online" as const,
        rooms: [], // deprecated on wire; handlers don't read it
      })),
    });
  }
}
