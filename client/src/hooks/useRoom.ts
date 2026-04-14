import { useEffect, useState } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';

interface RoomUser {
  id: string;
  username: string;
}

interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
}

// Handles joining/leaving a specific room and tracks the online users list.
// Server sends room:users whenever the user list changes.
export function useRoom(roomId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;
    // Join the room — server will emit room:users + message:history in response.
    socket.emit(EVENTS.ROOM_JOIN, { roomId });
    console.log('joining room', roomId);

    function onRoomUsers({ roomId: rid, users }: { roomId: string; users: RoomUser[] }) {
      if (rid === roomId) {
        setOnlineUsers(users.map((u) => u.username));
      }
    }
    function onRoomError({ message }: { message: string }) {
      console.error('[room error]', message);
    }

    socket.on(EVENTS.ROOM_USERS, onRoomUsers);
    socket.on(EVENTS.ROOM_ERROR, onRoomError);

    return () => {
      socket.off(EVENTS.ROOM_USERS, onRoomUsers);
      socket.off(EVENTS.ROOM_ERROR, onRoomError);
      console.log('leaving room', roomId);
      socket.emit(EVENTS.ROOM_LEAVE, { roomId });
    };
  }, [roomId]);

  return { onlineUsers };
}

// Fetches the list of all rooms.
// Server emits room:list back in response to room:list.
export function useRoomList() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onRoomList(data: RoomInfo[]) {
      setRooms(data ?? []);
      setLoading(false);
    }

    socket.on(EVENTS.ROOM_LIST_RESPONSE, onRoomList);
    socket.emit(EVENTS.ROOM_LIST);

    return () => {
      socket.off(EVENTS.ROOM_LIST_RESPONSE, onRoomList);
    };
  }, []);

  function refresh() {
    setLoading(true);
    socket.emit(EVENTS.ROOM_LIST);
  }

  return { rooms, loading, refresh };
}

// Returns a promise that resolves with the new room on room:created,
// or rejects on room:error.
export function socketCreateRoom(name: string): Promise<{ id: string; name: string }> {
  return new Promise((resolve, reject) => {
    function onCreated(room: { id: string; name: string }) {
      cleanup();
      resolve(room);
    }
    function onError({ message }: { message: string }) {
      cleanup();
      reject(new Error(message));
    }
    function cleanup() {
      socket.off(EVENTS.ROOM_CREATED, onCreated);
      socket.off(EVENTS.ROOM_ERROR, onError);
    }

    socket.on(EVENTS.ROOM_CREATED, onCreated);
    socket.on(EVENTS.ROOM_ERROR, onError);
    socket.emit(EVENTS.ROOM_CREATE, { name });
  });
}
