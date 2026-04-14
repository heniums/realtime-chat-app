import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { EVENTS, JwtPayload } from "../types";
import { addUser } from "../store";

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

    // Re-register user in the store with the new socket.id.
    // On reconnect, the old socket.id was cleaned up on disconnect,
    // so this creates a fresh entry under the new socket.id.
    addUser(socket.id, payload.username);

    // Attach user data to socket.data for handler access.
    socket.data.userId = socket.id;
    socket.data.username = payload.username;

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}
