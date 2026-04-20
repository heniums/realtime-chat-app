import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { JwtPayload, EVENTS } from "../types";
import {
  addUser,
  cancelUserRemoval,
  getUserByUsername,
  getUsersInRoom,
  transferUser,
} from "../store";
import { JWT_SECRET } from "../config/env";
import { findUserById } from "../db/queries/users";

const COOKIE_NAME = "token";

/**
 * Socket.IO connection middleware.
 *
 * Reads JWT from:
 *  1. httpOnly cookie (primary — set by REST /auth/login or /auth/register)
 *  2. socket.handshake.auth.token (fallback — for non-browser clients)
 *
 * Verifies the token, confirms the user exists in the DB, then
 * re-registers them in the in-memory store for presence tracking.
 *
 * No token → reject (login is now REST-only, anonymous access removed).
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

    // Handle reconnection (grace period)
    const wasPending = cancelUserRemoval(dbUser.username);

    if (wasPending) {
      const oldUser = getUserByUsername(dbUser.username);
      if (oldUser) {
        console.log(
          `[auth] reconnected: ${dbUser.username} (${oldUser.id} → ${socket.id})`,
        );
        const user = transferUser(oldUser.id, socket.id, dbUser.username);

        for (const roomId of user.rooms) {
          socket.join(roomId);
          socket.to(roomId).emit(EVENTS.ROOM_USERS, {
            roomId,
            users: getUsersInRoom(roomId),
          });
        }
      } else {
        addUser(socket.id, dbUser.username);
      }
    } else {
      addUser(socket.id, dbUser.username);
    }

    // Attach DB user info to socket.data
    socket.data.userId = dbUser.id; // Now a UUID, not socket.id
    socket.data.username = dbUser.username;

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}
