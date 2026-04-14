import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerAuthHandlers } from "./handlers/auth";
import { registerRoomHandlers } from "./handlers/room";
import { registerMessageHandlers } from "./handlers/message";
import { authMiddleware } from "../middleware/auth";
import {
  removeUser,
  getUser,
  removeUserFromRoom,
  getUsersInRoom,
  scheduleUserRemoval,
} from "../store";
import { EVENTS } from "../types";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  // Verify JWT on every connection (first-time users without tokens pass through).
  io.use(authMiddleware);

  io.on(EVENTS.CONNECTION, (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerAuthHandlers(socket);
    registerRoomHandlers(socket, io);
    registerMessageHandlers(socket, io);

    socket.on(EVENTS.DISCONNECT, () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const user = getUser(socket.id);
      if (!user) return;

      // Immediately remove user from all rooms and notify members.
      // The user IS offline — showing them in room lists would be misleading.
      // When they reconnect, useRoom re-joins rooms automatically.
      for (const roomId of [...user.rooms]) {
        socket
          .to(roomId)
          .emit(EVENTS.ROOM_USER_LEFT, { roomId, userId: socket.id });
        removeUserFromRoom(roomId, socket.id);
        io.to(roomId).emit(EVENTS.ROOM_USERS, {
          roomId,
          users: getUsersInRoom(roomId),
        });
      }

      // Schedule user removal after a grace period instead of deleting immediately.
      // This keeps the username reserved so a reconnecting client (page reload,
      // brief network drop) can reclaim it via the auth middleware.
      scheduleUserRemoval(user.username, () => {
        console.log(
          `[socket] grace period expired for ${user.username}, removing user`,
        );
        removeUser(socket.id);
      });
    });
  });

  return io;
}
