# Phase 2 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete React frontend that connects to the Phase 1 backend and delivers a working real-time chat experience in the browser.

**Architecture:** A Vite + React + TypeScript SPA using React Router 6 for three pages (`/`, `/rooms`, `/rooms/:id`). A singleton `socket.io-client` instance is created once and shared across the app via module scope; React context holds auth state (token + username). Four custom hooks encapsulate all socket I/O and keep pages/components free of socket.emit calls.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), React Router 6, socket.io-client

---

## File Structure

```
client/
├── src/
│   ├── socket/
│   │   └── client.ts          # Singleton socket instance (autoConnect: false)
│   ├── context/
│   │   └── AuthContext.tsx    # token + username state, login/logout actions
│   ├── hooks/
│   │   ├── useSocket.ts       # Connect/disconnect lifecycle tied to auth token
│   │   ├── useRoom.ts         # useRoom (join/leave + onlineUsers) + useRoomList
│   │   ├── useMessages.ts     # History load + real-time append + auto-scroll ref
│   │   └── useTyping.ts       # Debounced typing:start/stop + incoming indicator
│   ├── components/
│   │   ├── MessageList.tsx    # Scrollable bubble list (mine right, theirs left)
│   │   ├── MessageInput.tsx   # Textarea; Enter = send, Shift+Enter = newline
│   │   ├── OnlineUsers.tsx    # Sidebar with green dot; current user highlighted
│   │   └── TypingIndicator.tsx # Fixed-height "X is typing…" label
│   ├── pages/
│   │   ├── Login.tsx          # Username form → auth:login → navigate to /rooms
│   │   ├── Rooms.tsx          # List rooms, create room, logout
│   │   └── Chat.tsx           # Full chat view — wires all hooks + components
│   ├── App.tsx                # Router, RequireAuth guard, SocketManager
│   ├── main.tsx               # React root mount
│   └── index.css              # @import "tailwindcss" + global resets
├── .env                       # VITE_SERVER_URL=http://localhost:3001
├── vite.config.ts             # Vite + @tailwindcss/vite plugin
├── tsconfig.json              # Vite default (strict, verbatimModuleSyntax)
└── package.json               # scripts: dev / build / preview
```

---

## Task 1: Scaffold and configure the client

**Files:**
- Create: `client/` (Vite scaffold)
- Modify: `client/vite.config.ts`
- Create: `client/src/index.css`
- Create: `client/.env`

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest client -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd client
npm install
npm install tailwindcss @tailwindcss/vite socket.io-client react-router-dom
```

- [ ] **Step 3: Configure Tailwind in vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
```

- [ ] **Step 4: Replace index.css with Tailwind v4 import**

```css
@import "tailwindcss";

*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
#root { min-height: 100svh; }
```

- [ ] **Step 5: Add VITE_SERVER_URL to client/.env**

```
VITE_SERVER_URL=http://localhost:3001
```

- [ ] **Step 6: Remove boilerplate**

Delete `src/App.css` and `src/assets/react.svg`.

- [ ] **Step 7: Create source directories**

```bash
mkdir -p src/{socket,context,hooks,pages,components}
```

- [ ] **Step 8: Commit**

```bash
git add client/
git commit -m "feat: scaffold Vite + React + Tailwind client"
```

---

## Task 2: Socket singleton

**Files:**
- Create: `client/src/socket/client.ts`

- [ ] **Step 1: Write the singleton**

```typescript
import { io } from 'socket.io-client';

// autoConnect: false — attach auth before connecting.
// Call socket.connect() after login.
const socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001', {
  autoConnect: false,
  transports: ['websocket'],
});

export default socket;
```

- [ ] **Step 2: Commit**

```bash
git add src/socket/client.ts
git commit -m "feat: add socket.io-client singleton"
```

---

## Task 3: Auth context

**Files:**
- Create: `client/src/context/AuthContext.tsx`

- [ ] **Step 1: Write the context**

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthState {
  token: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ token: null, username: null });

  function login(token: string, username: string) {
    setAuth({ token, username });
  }

  function logout() {
    setAuth({ token: null, username: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: add AuthContext with login/logout"
```

---

## Task 4: Custom hooks

**Files:**
- Create: `client/src/hooks/useSocket.ts`
- Create: `client/src/hooks/useRoom.ts`
- Create: `client/src/hooks/useMessages.ts`
- Create: `client/src/hooks/useTyping.ts`

### useSocket.ts

Manages socket connect/disconnect lifecycle tied to the auth token.

- [ ] **Step 1: Write useSocket**

```typescript
import { useEffect, useState } from 'react';
import socket from '../socket/client';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    socket.auth = { token };
    socket.connect();

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [token]);

  return { connected };
}
```

### useRoom.ts

`useRoom` — joins a specific room on mount, leaves on unmount, tracks online users via `presence:update`.
`useRoomList` — fetches all rooms via `room:list` callback.

- [ ] **Step 2: Write useRoom**

```typescript
import { useEffect, useState } from 'react';
import socket from '../socket/client';

interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
}

export function useRoom(roomId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;

    socket.emit('room:join', { roomId }, (response: { error?: string; users?: string[] }) => {
      if (!response.error && response.users) {
        setOnlineUsers(response.users);
      }
    });

    function onPresenceUpdate({ roomId: rid, users }: { roomId: string; users: string[] }) {
      if (rid === roomId) setOnlineUsers(users);
    }

    socket.on('presence:update', onPresenceUpdate);

    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.emit('room:leave', { roomId });
    };
  }, [roomId]);

  return { onlineUsers };
}

export function useRoomList() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.emit('room:list', {}, (response: { rooms: RoomInfo[] }) => {
      setRooms(response.rooms ?? []);
      setLoading(false);
    });
  }, []);

  function refresh() {
    setLoading(true);
    socket.emit('room:list', {}, (response: { rooms: RoomInfo[] }) => {
      setRooms(response.rooms ?? []);
      setLoading(false);
    });
  }

  return { rooms, loading, refresh };
}
```

### useMessages.ts

Loads message history via `message:history` callback on room enter, appends `message:new` events, auto-scrolls to bottom.

- [ ] **Step 3: Write useMessages**

```typescript
import { useEffect, useState, useRef } from 'react';
import socket from '../socket/client';

interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export function useMessages(roomId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    socket.emit('message:history', { roomId }, (response: { messages: Message[] }) => {
      setMessages(response.messages ?? []);
    });

    function onNewMessage(msg: Message) {
      if (msg.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    }

    socket.on('message:new', onNewMessage);

    return () => {
      socket.off('message:new', onNewMessage);
      setMessages([]);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text: string) {
    if (!roomId || !text.trim()) return;
    socket.emit('message:send', { roomId, text: text.trim() });
  }

  return { messages, sendMessage, bottomRef };
}
```

### useTyping.ts

Emits `typing:start` on first keystroke per burst; debounces `typing:stop` 1500ms after last keystroke. Listens for `typing:update` from the server.

- [ ] **Step 4: Write useTyping**

```typescript
import { useEffect, useState, useRef } from 'react';
import socket from '../socket/client';

const TYPING_DEBOUNCE_MS = 1500;

export function useTyping(roomId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    function onTypingUpdate({ roomId: rid, users }: { roomId: string; users: string[] }) {
      if (rid === roomId) setTypingUsers(users);
    }

    socket.on('typing:update', onTypingUpdate);

    return () => {
      socket.off('typing:update', onTypingUpdate);
      setTypingUsers([]);
    };
  }, [roomId]);

  function notifyTyping() {
    if (!roomId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { roomId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { roomId });
    }, TYPING_DEBOUNCE_MS);
  }

  function stopTyping() {
    if (!roomId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing:stop', { roomId });
    }
  }

  return { typingUsers, notifyTyping, stopTyping };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useSocket, useRoom, useMessages, useTyping hooks"
```

---

## Task 5: Components

**Files:**
- Create: `client/src/components/MessageList.tsx`
- Create: `client/src/components/MessageInput.tsx`
- Create: `client/src/components/OnlineUsers.tsx`
- Create: `client/src/components/TypingIndicator.tsx`

- [ ] **Step 1: Write MessageList**

Displays messages as chat bubbles. Current user's messages appear on the right (indigo bg), others on the left (gray bg). Accepts a `bottomRef` for auto-scrolling.

```typescript
import { type RefObject } from 'react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
  bottomRef: RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, bottomRef }: MessageListProps) {
  const { username: currentUser } = useAuth();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map((msg) => {
        const isMine = msg.username === currentUser;
        return (
          <div key={msg.id} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-400">{msg.username}</span>
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm break-words ${
              isMine ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
            <span className="text-xs text-gray-300">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 2: Write MessageInput**

Textarea that sends on Enter (no Shift). Fires `onTyping` on every change; fires `onStopTyping` on submit.

```typescript
import { useState, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export function MessageInput({ onSend, onTyping, onStopTyping }: MessageInputProps) {
  const [text, setText] = useState('');

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onStopTyping();
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3 flex items-end gap-2">
      <textarea
        className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-32"
        rows={1}
        placeholder="Type a message… (Enter to send)"
        value={text}
        onChange={(e) => { setText(e.target.value); if (e.target.value) onTyping(); }}
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write OnlineUsers**

Sidebar listing usernames with a green dot. Current user gets `(you)` suffix.

```typescript
import { useAuth } from '../context/AuthContext';

interface OnlineUsersProps {
  users: string[];
}

export function OnlineUsers({ users }: OnlineUsersProps) {
  const { username: currentUser } = useAuth();

  return (
    <aside className="w-48 border-l border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Online ({users.length})
        </h3>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {users.map((user) => (
          <li key={user} className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className={user === currentUser ? 'font-semibold' : ''}>
              {user}
              {user === currentUser && <span className="ml-1 text-xs text-gray-400">(you)</span>}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 4: Write TypingIndicator**

Fixed-height container to prevent layout shift. Shows "X is typing…", "X and Y are typing…", or "X, Y, and N others are typing…".

```typescript
interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return <div className="h-5" />;

  let label: string;
  if (users.length === 1) label = `${users[0]} is typing…`;
  else if (users.length === 2) label = `${users[0]} and ${users[1]} are typing…`;
  else label = `${users[0]}, ${users[1]}, and ${users.length - 2} others are typing…`;

  return <div className="h-5 px-4 text-xs text-gray-400 italic">{label}</div>;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add MessageList, MessageInput, OnlineUsers, TypingIndicator"
```

---

## Task 6: Pages

**Files:**
- Create: `client/src/pages/Login.tsx`
- Create: `client/src/pages/Rooms.tsx`
- Create: `client/src/pages/Chat.tsx`

### Login.tsx

Form with a username input. On submit: connect socket → emit `auth:login` → on callback store token in context → navigate to `/rooms`. On error: show message + disconnect socket.

- [ ] **Step 1: Write Login.tsx**

```typescript
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    socket.connect();
    socket.emit('auth:login', { username: trimmed }, (response: { token?: string; error?: string }) => {
      setLoading(false);
      if (response.error || !response.token) {
        setError(response.error ?? 'Login failed');
        socket.disconnect();
        return;
      }
      login(response.token, trimmed);
      navigate('/rooms');
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h1>
        <p className="text-sm text-gray-500 mb-6">Enter a username to start chatting.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              id="username" type="text" autoFocus autoComplete="off"
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alice"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={!username.trim() || loading}
            className="w-full py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Connecting…' : 'Join chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Rooms.tsx

Lists rooms from `useRoomList`. Create-room form emits `room:create` and navigates to the new room on success.

- [ ] **Step 2: Write Rooms.tsx**

```typescript
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket/client';
import { useAuth } from '../context/AuthContext';
import { useRoomList } from '../hooks/useRoom';

export default function Rooms() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const { rooms, loading, refresh } = useRoomList();
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function handleJoin(roomId: string) { navigate(`/rooms/${roomId}`); }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    setCreating(true); setCreateError('');
    socket.emit('room:create', { name }, (response: { room?: { id: string; name: string }; error?: string }) => {
      setCreating(false);
      if (response.error || !response.room) { setCreateError(response.error ?? 'Could not create room'); return; }
      setNewRoomName('');
      navigate(`/rooms/${response.room.id}`);
    });
  }

  function handleLogout() { logout(); socket.disconnect(); navigate('/'); }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Chat rooms</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Signed in as <strong>{username}</strong></span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 underline">Leave</button>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Create a new room</h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input type="text" placeholder="Room name" value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button type="submit" disabled={!newRoomName.trim() || creating}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 transition-colors">
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
          {createError && <p className="text-sm text-red-500 mt-2">{createError}</p>}
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Available rooms</h2>
            <button onClick={refresh} className="text-xs text-indigo-500 hover:text-indigo-700">Refresh</button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-gray-400">No rooms yet. Create one above!</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{room.name}</p>
                    <p className="text-xs text-gray-400">{room.userCount} online</p>
                  </div>
                  <button onClick={() => handleJoin(room.id)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors">Join</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
```

### Chat.tsx

Joins the room on mount, leaves on unmount. Wires all hooks and renders the full chat layout: header with back button, message list, typing indicator, message input, and online users sidebar.

- [ ] **Step 3: Write Chat.tsx**

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { useMessages } from '../hooks/useMessages';
import { useTyping } from '../hooks/useTyping';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { OnlineUsers } from '../components/OnlineUsers';
import { TypingIndicator } from '../components/TypingIndicator';

export default function Chat() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { username } = useAuth();
  const { onlineUsers } = useRoom(roomId);
  const { messages, sendMessage, bottomRef } = useMessages(roomId);
  const { typingUsers, notifyTyping, stopTyping } = useTyping(roomId);

  function handleSend(text: string) { sendMessage(text); stopTyping(); }
  const othersTyping = typingUsers.filter((u) => u !== username);

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/rooms')} className="text-gray-400 hover:text-gray-600" aria-label="Back to rooms">←</button>
        <h1 className="text-sm font-semibold text-gray-900">Room: <span className="font-mono text-xs text-gray-500">{roomId}</span></h1>
      </header>
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0">
          <MessageList messages={messages} bottomRef={bottomRef} />
          <TypingIndicator users={othersTyping} />
          <MessageInput onSend={handleSend} onTyping={notifyTyping} onStopTyping={stopTyping} />
        </div>
        <OnlineUsers users={onlineUsers} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/
git commit -m "feat: add Login, Rooms, Chat pages"
```

---

## Task 7: App routing

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Write App.tsx with routing + auth guard**

```typescript
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import Login from './pages/Login';
import Rooms from './pages/Rooms';
import Chat from './pages/Chat';

function SocketManager() {
  useSocket();
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketManager />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/rooms" element={<RequireAuth><Rooms /></RequireAuth>} />
          <Route path="/rooms/:id" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verify production build**

```bash
npm run build
```

Expected: `✓ built in ~150ms`, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire React Router 6 routing with RequireAuth guard"
```

---

## TypeScript Notes

This scaffold uses `verbatimModuleSyntax: true` (Vite default). All type-only imports **must** use `import type`:

```typescript
// WRONG — will fail build
import { ReactNode } from 'react';

// CORRECT
import { type ReactNode } from 'react';
// or
import type { ReactNode } from 'react';
```

Also: `JSX.Element` is deprecated in React 18. Use `ReactNode` instead.

---

## Verification

After all tasks, open two browser tabs at `http://localhost:5173`:
1. Tab 1: login as `alice`, create a room, enter it
2. Tab 2: login as `bob`, join the same room
3. Verify: both users appear in the Online sidebar
4. Alice types → Bob sees "alice is typing…"
5. Alice sends a message → Bob sees it appear in real time
6. Bob leaves → Alice's sidebar updates
