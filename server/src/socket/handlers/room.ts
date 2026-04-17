import { Socket, Server } from "socket.io";
import { EVENTS, USER_STATUS } from "../../types";
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
    const roomList = listRooms().map((room) => {
      const users = getUsersInRoom(room.id);
      return {
        id: room.id,
        name: room.name,
        userCount: users.length,
        onlineCount: users.filter((u) => u.status === USER_STATUS.ONLINE).length,
      };
    });
    socket.emit(EVENTS.ROOM_LIST_RESPONSE, roomList);
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

    // Send updated user list to everyone in room
    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: getUsersInRoom(roomId),
    });

    // Broadcast updated room list so all clients see the new userCount
    io.emit(EVENTS.ROOM_LIST_RESPONSE, listRooms().map((r) => {
      const users = getUsersInRoom(r.id);
      return {
        id: r.id,
        name: r.name,
        userCount: users.length,
        onlineCount: users.filter((u) => u.status === USER_STATUS.ONLINE).length,
      };
    }));
  });

  // ── room:leave ─────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_LEAVE, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.leave(roomId);
    removeUserFromRoom(roomId, socket.id);

    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: getUsersInRoom(roomId),
    });

    // Broadcast updated room list so all clients see the new userCount
    io.emit(EVENTS.ROOM_LIST_RESPONSE, listRooms().map((r) => {
      const users = getUsersInRoom(r.id);
      return {
        id: r.id,
        name: r.name,
        userCount: users.length,
        onlineCount: users.filter((u) => u.status === USER_STATUS.ONLINE).length,
      };
    }));
  });
}
