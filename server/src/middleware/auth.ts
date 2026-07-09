import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JwtPayload, EVENTS } from "../types";
import {
  addUser,
  getUserByUsername,
  getUsersInRoom,
  transferUser,
} from "../store";

// Socket.IO connection middleware — runs before the "connection" event fires.
// If the client sends a JWT token via socket.auth, this middleware verifies it
// and re-registers the user in the store (critical for reconnection).
// First-time users (no token) pass through to use the auth:login event handler.
export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const token = socket.handshake.auth?.token;

  // No token = first-time user. Let them through to use auth:login.
  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET ?? "fallback_secret";
    const payload = jwt.verify(token, secret) as JwtPayload;

    // Check if this user already exists (reconnection with a new socket ID)
    const oldUser = await getUserByUsername(payload.username);
    if (oldUser) {
      // Transfer the existing user to the new socket ID
      console.log(
        `[auth] reconnected: ${payload.username} (${oldUser.id} → ${socket.id})`,
      );
      const user = await transferUser(oldUser.id, socket.id, payload.username);

      // Re-join Socket.IO rooms and broadcast updated (online) user lists.
      for (const roomId of user.rooms) {
        socket.join(roomId);
        socket.to(roomId).emit(EVENTS.ROOM_USERS, {
          roomId,
          users: await getUsersInRoom(roomId),
        });
      }
    } else {
      // Normal reconnection or first connection with a token from a previous session.
      // Create a fresh user entry.
      await addUser(socket.id, payload.username);
    }

    // Attach user data to socket.data for handler access.
    socket.data.userId = socket.id;
    socket.data.username = payload.username;

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}
