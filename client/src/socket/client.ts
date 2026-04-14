import { io } from 'socket.io-client';

// Singleton socket instance — one connection shared across the whole app.
// The socket starts disconnected (autoConnect: false) so we can attach
// auth data before connecting. Call socket.connect() after login.
const socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001', {
  autoConnect: false,
  transports: ['websocket'],
});

export default socket;
