import { Socket } from "socket.io";
import { EVENTS } from "../../types";

/**
 * Auth is now handled via REST routes (/auth/register, /auth/login).
 * The Socket.IO auth middleware validates the JWT cookie on connection.
 *
 * This handler just emits the authenticated user info back to the client
 * so it can confirm the connection is authenticated.
 */
export function registerAuthHandlers(socket: Socket): void {
  // Emit auth confirmation on connection (called by the connection handler)
  if (socket.data.userId && socket.data.username) {
    socket.emit(EVENTS.AUTH_TOKEN, {
      userId: socket.data.userId,
      username: socket.data.username,
    });
  }
}
