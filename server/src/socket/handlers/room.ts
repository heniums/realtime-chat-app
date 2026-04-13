import { Socket, Server } from "socket.io";
import { EVENTS } from "../../types";
import {
  getUser,
  createRoom,
  getRoom,
  getRoomByName,
  listRooms,
  addUserToRoom,
  removeUserFromRoom,
  getUsersInRoom,
  getMessages,
} from "../../store";

export function registerRoomHandlers(socket: Socket, io: Server): void {
  // ── room:list ──────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_LIST, () => {
    socket.emit(EVENTS.ROOM_LIST_RESPONSE, listRooms());
  });

  // ── room:create ────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_CREATE, ({ name }: { name: string }) => {
    if (!name || !name.trim()) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room name is required" });
      return;
    }
    if (getRoomByName(name.trim())) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room name already exists" });
      return;
    }
    const room = createRoom(name.trim());
    io.emit(EVENTS.ROOM_CREATED, room); // broadcast to all clients
  });

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_JOIN, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    const room = getRoom(roomId);

    if (!user) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Not authenticated" });
      return;
    }
    if (!room) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    addUserToRoom(roomId, socket.id);

    // Send history to the joining user
    socket.emit(EVENTS.MESSAGE_HISTORY, getMessages(roomId));

    // Notify others in room
    socket.to(roomId).emit(EVENTS.ROOM_USER_JOINED, { roomId, user });

    // Send updated user list to everyone in room
    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: getUsersInRoom(roomId),
    });
  });

  // ── room:leave ─────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_LEAVE, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.leave(roomId);
    removeUserFromRoom(roomId, socket.id);

    socket
      .to(roomId)
      .emit(EVENTS.ROOM_USER_LEFT, { roomId, userId: socket.id });
    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: getUsersInRoom(roomId),
    });
  });
}
