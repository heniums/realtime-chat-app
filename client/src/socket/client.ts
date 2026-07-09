import { io } from 'socket.io-client';

// Singleton socket instance — one connection shared across the whole app.
// The socket starts disconnected (autoConnect: false) so we can attach
// auth data before connecting. Call socket.connect() after login.
//
// In production (unified deployment or Vercel), VITE_SERVER_URL is unset so
// we connect to the same origin. In dev, it points to the separate backend.
//
// Transports: WebSocket + polling locally. On Vercel serverless, only polling
// works — the server will negotiate the best available transport.
const serverUrl = import.meta.env.VITE_SERVER_URL;
const transports = (import.meta.env.VITE_SOCKET_TRANSPORTS as string | undefined)?.split(',') ?? ['websocket', 'polling'];

const socket = serverUrl
  ? io(serverUrl, { autoConnect: false, transports })
  : io({ autoConnect: false, transports });

export default socket;
