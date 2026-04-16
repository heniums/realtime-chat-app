import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerAuthHandlers } from "./handlers/auth";
import { registerRoomHandlers } from "./handlers/room";
import { registerMessageHandlers } from "./handlers/message";
import { registerReactionHandlers } from "./handlers/reaction";
import { authMiddleware } from "../middleware/auth";
import {
  removeUser,
  getUser,
  removeUserFromRoom,
  getUsersInRoom,
  scheduleUserRemoval,
  setUserStatus,
} from "../store";
import { EVENTS, USER_STATUS } from "../types";

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
    registerReactionHandlers(socket, io);

    socket.on(EVENTS.DISCONNECT, () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const user = getUser(socket.id);
      if (!user) return;

      // Mark user as offline and broadcast updated user lists to all rooms.
      // The user stays in room memberships so other users can see them as
      // "offline" during the grace period.
      setUserStatus(socket.id, USER_STATUS.OFFLINE);
      for (const roomId of user.rooms) {
        io.to(roomId).emit(EVENTS.ROOM_USERS, {
          roomId,
          users: getUsersInRoom(roomId),
        });
      }

      // After the grace period, fully remove the user from rooms and the store.
      scheduleUserRemoval(user.username, () => {
        console.log(
          `[socket] grace period expired for ${user.username}, removing user`,
        );
        // Snapshot rooms before removal (removeUserFromRoom mutates user.rooms)
        const roomIds = [...user.rooms];
        for (const roomId of roomIds) {
          removeUserFromRoom(roomId, user.id);
          io.to(roomId).emit(EVENTS.ROOM_USERS, {
            roomId,
            users: getUsersInRoom(roomId),
          });
        }
        removeUser(user.id);
      });
    });
  });

  return io;
}
