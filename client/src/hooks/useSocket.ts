import { useEffect, useState } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';
import { useAuth } from '../context/AuthContext';

// Manages socket connection lifecycle tied to auth state.
// Connects when a token is present, disconnects on logout.
export function useSocket() {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    socket.auth = { token };
    socket.connect();

    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on(EVENTS.CONNECT, onConnect);
    socket.on(EVENTS.DISCONNECT, onDisconnect);

    return () => {
      socket.off(EVENTS.CONNECT, onConnect);
      socket.off(EVENTS.DISCONNECT, onDisconnect);
      socket.disconnect();
    };
  }, [token]);

  return { connected };
}

// Read-only hook for socket connection status.
// Use this in pages/components that need to show connection state
// without triggering connect/disconnect side effects.
export function useConnected() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }

    socket.on(EVENTS.CONNECT, onConnect);
    socket.on(EVENTS.DISCONNECT, onDisconnect);

    return () => {
      socket.off(EVENTS.CONNECT, onConnect);
      socket.off(EVENTS.DISCONNECT, onDisconnect);
    };
  }, []);

  return connected;
}

// Handles auth:login — listens for auth:token (success) or auth:error (fail).
// Returns a promise so callers can await the outcome.
export function socketLogin(username: string): Promise<{ token: string }> {
  return new Promise((resolve, reject) => {
    function onToken({ token }: { token: string }) {
      cleanup();
      resolve({ token });
    }
    function onError({ message }: { message: string }) {
      cleanup();
      reject(new Error(message));
    }
    function cleanup() {
      socket.off(EVENTS.AUTH_TOKEN, onToken);
      socket.off(EVENTS.AUTH_ERROR, onError);
    }

    socket.on(EVENTS.AUTH_TOKEN, onToken);
    socket.on(EVENTS.AUTH_ERROR, onError);
    socket.emit(EVENTS.AUTH_LOGIN, { username });
  });
}
