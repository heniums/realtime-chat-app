import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerAuthHandlers } from "./handlers/auth";
import { registerRoomHandlers } from "./handlers/room";
import { registerMessageHandlers } from "./handlers/message";
import {
  removeUser,
  getUser,
  removeUserFromRoom,
  getUsersInRoom,
} from "../store";
import { EVENTS } from "../types";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerAuthHandlers(socket);
    registerRoomHandlers(socket, io);
    registerMessageHandlers(socket, io);

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const user = getUser(socket.id);
      if (user) {
        // Leave all rooms and notify members
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
        removeUser(socket.id);
      }
    });
  });

  return io;
}
