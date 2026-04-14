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
// Re-joins automatically on socket reconnection.
export function useRoom(roomId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // Reset state when roomId changes — this is intentional synchronization
    // with the external socket system, not a cascading render issue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoined(false);
    setRoomError(null);

    // Join the room — server will emit room:users + message:history in response.
    socket.emit(EVENTS.ROOM_JOIN, { roomId });

    function onRoomUsers({ roomId: rid, users }: { roomId: string; users: RoomUser[] }) {
      if (rid === roomId) {
        setOnlineUsers(users.map((u) => u.username));
        setJoined(true);
      }
    }
    function onRoomError({ message }: { message: string }) {
      setRoomError(message);
      setTimeout(() => setRoomError(null), 5000);
    }
    function onReconnected() {
      // Re-join after the socket reconnects so we get fresh room:users + message:history.
      setJoined(false);
      socket.emit(EVENTS.ROOM_JOIN, { roomId });
    }

    socket.on(EVENTS.ROOM_USERS, onRoomUsers);
    socket.on(EVENTS.ROOM_ERROR, onRoomError);
    socket.on(EVENTS.APP_RECONNECTED, onReconnected);

    return () => {
      socket.off(EVENTS.ROOM_USERS, onRoomUsers);
      socket.off(EVENTS.ROOM_ERROR, onRoomError);
      socket.off(EVENTS.APP_RECONNECTED, onReconnected);
      socket.emit(EVENTS.ROOM_LEAVE, { roomId });
    };
  }, [roomId]);

  return { onlineUsers, joined, roomError };
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
