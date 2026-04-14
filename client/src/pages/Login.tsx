import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket/client';
import { useAuth } from '../context/AuthContext';
import { socketLogin } from '../hooks/useSocket';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    // Connect the socket before emitting so we have a connection to send on.
    socket.connect();

    try {
      const { token } = await socketLogin(trimmed);
      login(token, trimmed);
      navigate('/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      socket.disconnect();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h1>
        <p className="text-sm text-gray-500 mb-6">Enter a username to start chatting.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoFocus
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alice"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!username.trim() || loading}
            className="w-full py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Connecting…' : 'Join chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
