import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
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
  setUserStatus,
} from "../store";
import { EVENTS, USER_STATUS } from "../types";
import { redis, isRedisEnabled } from "../redis";

export function initSocket(httpServer: HttpServer): Server {
  const transports = (process.env.SOCKET_TRANSPORTS?.split(",") ?? [
    "websocket",
    "polling",
  ]) as Array<"websocket" | "polling">;
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
      methods: ["GET", "POST"],
    },
    transports,
  });

  // Attach Redis adapter for cross-instance pub/sub if Redis is configured.
  if (isRedisEnabled() && redis) {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[socket] Redis adapter attached");
  }

  // Verify JWT on every connection (first-time users without tokens pass through).
  // Socket.IO middleware expects (socket, next) => void, but our authMiddleware is async.
  // We wrap it to match the expected signature.
  io.use((socket, next) => {
    authMiddleware(socket, next).catch(next);
  });

  io.on(EVENTS.CONNECTION, (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerAuthHandlers(socket);
    registerRoomHandlers(socket, io);
    registerMessageHandlers(socket, io);
    registerReactionHandlers(socket, io);

    socket.on(EVENTS.DISCONNECT, async () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const user = await getUser(socket.id);
      if (!user) return;

      // Mark user as offline and broadcast updated user lists to all rooms.
      await setUserStatus(socket.id, USER_STATUS.OFFLINE);
      for (const roomId of user.rooms) {
        io.to(roomId).emit(EVENTS.ROOM_USERS, {
          roomId,
          users: await getUsersInRoom(roomId),
        });
      }

      // Remove user from all rooms and the store immediately.
      // (Grace periods don't work in serverless — functions may terminate immediately.)
      const roomIds = [...user.rooms];
      for (const roomId of roomIds) {
        await removeUserFromRoom(roomId, user.id);
        io.to(roomId).emit(EVENTS.ROOM_USERS, {
          roomId,
          users: await getUsersInRoom(roomId),
        });
      }
      await removeUser(user.id);
    });
  });

  return io;
}
