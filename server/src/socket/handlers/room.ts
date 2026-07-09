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
  socket.on(EVENTS.ROOM_LIST, async () => {
    const rooms = await listRooms();
    const roomList = await Promise.all(
      rooms.map(async (room) => {
        const users = await getUsersInRoom(room.id);
        return {
          id: room.id,
          name: room.name,
          userCount: users.length,
          onlineCount: users.filter((u) => u.status === USER_STATUS.ONLINE).length,
        };
      }),
    );
    socket.emit(EVENTS.ROOM_LIST_RESPONSE, roomList);
  });

  // ── room:create ────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_CREATE, async ({ name }: { name: string }) => {
    if (!name || !name.trim()) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room name is required" });
      return;
    }
    if (await getRoomByName(name.trim())) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room name already exists" });
      return;
    }
    const room = await createRoom(name.trim());
    io.emit(EVENTS.ROOM_CREATED, room); // broadcast to all clients
  });

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_JOIN, async ({ roomId }: { roomId: string }) => {
    const user = await getUser(socket.id);
    const room = await getRoom(roomId);

    if (!user) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Not authenticated" });
      return;
    }
    if (!room) {
      socket.emit(EVENTS.ROOM_ERROR, { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    await addUserToRoom(roomId, socket.id);

    // Send history to the joining user
    socket.emit(EVENTS.MESSAGE_HISTORY, await getMessages(roomId));

    // Send updated user list to everyone in room
    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: await getUsersInRoom(roomId),
    });

    // Broadcast updated room list so all clients see the new userCount
    const allRooms = await listRooms();
    const roomList = await Promise.all(
      allRooms.map(async (r) => {
        const users = await getUsersInRoom(r.id);
        return {
          id: r.id,
          name: r.name,
          userCount: users.length,
          onlineCount: users.filter((u) => u.status === USER_STATUS.ONLINE).length,
        };
      }),
    );
    io.emit(EVENTS.ROOM_LIST_RESPONSE, roomList);
  });

  // ── room:leave ─────────────────────────────────────────────────────────────
  socket.on(EVENTS.ROOM_LEAVE, async ({ roomId }: { roomId: string }) => {
    const user = await getUser(socket.id);
    if (!user) return;

    socket.leave(roomId);
    await removeUserFromRoom(roomId, socket.id);

    io.to(roomId).emit(EVENTS.ROOM_USERS, {
      roomId,
      users: await getUsersInRoom(roomId),
    });

    // Broadcast updated room list so all clients see the new userCount
    const allRooms = await listRooms();
    const roomList = await Promise.all(
      allRooms.map(async (r) => {
        const users = await getUsersInRoom(r.id);
        return {
          id: r.id,
          name: r.name,
          userCount: users.length,
          onlineCount: users.filter((u) => u.status === USER_STATUS.ONLINE).length,
        };
      }),
    );
    io.emit(EVENTS.ROOM_LIST_RESPONSE, roomList);
  });
}
