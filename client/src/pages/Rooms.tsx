import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoomList, socketCreateRoom } from '../hooks/useRoom';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';
import { useEffect } from 'react';

interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  onlineCount: number;
}

export default function Rooms() {
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const { rooms, loading, refresh } = useRoomList();
  const [newRoomName, setNewRoomName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Re-fetch the room list whenever a new room is created by any client.
  useEffect(() => {
    function onRoomCreated() { refresh(); }
    socket.on(EVENTS.ROOM_CREATED, onRoomCreated);
    return () => { socket.off(EVENTS.ROOM_CREATED, onRoomCreated); };
  }, [refresh]);

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;

    setCreating(true);
    setCreateError('');
    try {
      const room = await socketCreateRoom(name);
      setNewRoomName('');
      // Navigate directly into the newly created room.
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create room');
    } finally {
      setCreating(false);
    }
  }

  function handleJoin(room: RoomInfo) {
    navigate(`/rooms/${room.id}`);
  }

  function handleLogout() {
    socket.disconnect();
    logout();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-900">Chat rooms</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Signed in as <strong>{username}</strong></span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto py-8 px-4 space-y-6">
        {/* Create room form */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            New room
          </h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name…"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={!newRoomName.trim() || creating}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? '…' : 'Create'}
            </button>
          </form>
          {createError && <p className="mt-2 text-xs text-red-500">{createError}</p>}
        </section>

        {/* Room list */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Rooms
          </h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading rooms…</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-gray-400">No rooms yet. Create one above.</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    onClick={() => handleJoin(room)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition text-left"
                  >
                    <span className="text-sm font-medium text-gray-800">{room.name}</span>
                    <span className="text-xs text-gray-400">
                      {room.onlineCount} online · {room.userCount} {room.userCount === 1 ? 'person' : 'people'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
