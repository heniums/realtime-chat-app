import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JwtPayload, EVENTS } from "../types";
import {
  addUser,
  cancelUserRemoval,
  getUserByUsername,
  getUsersInRoom,
  transferUser,
} from "../store";

// Socket.IO connection middleware — runs before the "connection" event fires.
// If the client sends a JWT token via socket.auth, this middleware verifies it
// and re-registers the user in the in-memory store (critical for reconnection).
// First-time users (no token) pass through to use the auth:login event handler.
export function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth?.token;

  // No token = first-time user. Let them through to use auth:login.
  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET ?? "fallback_secret";
    const payload = jwt.verify(token, secret) as JwtPayload;

    // Check if this user has a pending disconnect (page reload / brief drop).
    const wasPending = cancelUserRemoval(payload.username);

    if (wasPending) {
      // The old user entry still exists in the store under the old socket.id.
      // Transfer it to the new socket.id, preserving room memberships.
      const oldUser = getUserByUsername(payload.username);
      if (oldUser) {
        console.log(
          `[auth] reconnected: ${payload.username} (${oldUser.id} → ${socket.id})`,
        );
        const user = transferUser(oldUser.id, socket.id, payload.username);

        // Re-join Socket.IO rooms and broadcast updated (online) user lists.
        for (const roomId of user.rooms) {
          socket.join(roomId);
          socket.to(roomId).emit(EVENTS.ROOM_USERS, {
            roomId,
            users: getUsersInRoom(roomId),
          });
        }
      } else {
        // Edge case: timer was pending but user entry is gone (shouldn't happen).
        addUser(socket.id, payload.username);
      }
    } else {
      // Normal reconnection (no pending timer) or first connection with a
      // token from a previous session. Create a fresh user entry.
      addUser(socket.id, payload.username);
    }

    // Attach user data to socket.data for handler access.
    socket.data.userId = socket.id;
    socket.data.username = payload.username;

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}
