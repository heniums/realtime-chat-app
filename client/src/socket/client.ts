import { io } from 'socket.io-client';

// Singleton socket instance — one connection shared across the whole app.
// The socket starts disconnected (autoConnect: false) so we can attach
// auth data before connecting. Call socket.connect() after login.
// In production (unified deployment), VITE_SERVER_URL is unset so we
// connect to the same origin. In dev, it points to the separate backend.
const serverUrl = import.meta.env.VITE_SERVER_URL;
const socket = serverUrl
  ? io(serverUrl, { autoConnect: false, transports: ['websocket'] })
  : io({ autoConnect: false, transports: ['websocket'] });

export default socket;
