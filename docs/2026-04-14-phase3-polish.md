# Phase 3 — Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the existing realtime-chat-app with 7 UX improvements: smart auto-scroll, scroll-to-bottom button, mobile-responsive layout, reconnection handling, character limit on messages, chat loading states, and error states.

**Architecture:** All changes are edits to existing hooks and components. No new files, no new dependencies. The hooks layer (`useMessages`, `useRoom`, `useSocket`) gains new state/refs for scroll tracking, reconnection, and error surfaces. The component layer (`Chat.tsx`, `MessageList.tsx`, `MessageInput.tsx`, `OnlineUsers.tsx`) gets responsive breakpoints, new UI elements (banners, buttons, counters), and conditional rendering for loading/error.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, socket.io-client (existing)

---

## File Map

```
client/src/
├── hooks/
│   ├── useMessages.ts     # Modify: smart scroll, message errors, scroll-to-bottom state
│   ├── useRoom.ts         # Modify: room errors surfaced to UI, joined/loading state
│   └── useSocket.ts       # Modify: reconnection event, connected state exposed
├── components/
│   ├── MessageList.tsx     # Modify: scroll container ref, scroll-to-bottom button
│   ├── MessageInput.tsx    # Modify: maxLength, char counter
│   └── OnlineUsers.tsx     # Modify: responsive drawer on mobile
└── pages/
    └── Chat.tsx            # Modify: loading state, error banners, reconnect banner, mobile sidebar toggle
```

---

## Task 1: Smart Auto-Scroll (`useMessages.ts`)

**Files:**
- Modify: `client/src/hooks/useMessages.ts`

**Problem:** The current `useEffect` on `[messages]` always calls `bottomRef.current?.scrollIntoView()`, even when the user has scrolled up to read history.

**Solution:** Track whether the user is "near bottom" (within 100px of the scroll end). Only auto-scroll when near bottom. The scroll container ref is passed in from the component so the hook can read scroll position.

- [ ] **Step 1: Replace the unconditional auto-scroll with smart scroll logic**

Replace the entire `useMessages` hook in `client/src/hooks/useMessages.ts` with:

```ts
import { useEffect, useState, useRef, useCallback } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';

interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

const NEAR_BOTTOM_THRESHOLD = 100;

// Manages the message list for a room.
// History arrives via message:history when the room is joined.
// New messages arrive via message:received in real time.
export function useMessages(roomId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const hasNewMessageRef = useRef(false);

  // Check if the user is near the bottom of the scroll container.
  const checkNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  // Scroll event handler — update near-bottom state and hide scroll button.
  const handleScroll = useCallback(() => {
    const nearBottom = checkNearBottom();
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowScrollButton(false);
      hasNewMessageRef.current = false;
    }
  }, [checkNearBottom]);

  // Scroll to bottom programmatically.
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
    hasNewMessageRef.current = false;
  }, []);

  useEffect(() => {
    if (!roomId) return;

    function onHistory(msgs: Message[]) {
      setMessages(msgs ?? []);
      // Always scroll to bottom on initial history load.
      isNearBottomRef.current = true;
      hasNewMessageRef.current = false;
      setShowScrollButton(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
    function onNewMessage(msg: Message) {
      if (msg.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
        if (!isNearBottomRef.current) {
          hasNewMessageRef.current = true;
          setShowScrollButton(true);
        }
      }
    }
    function onMessageError({ message }: { message: string }) {
      setMessageError(message);
      setTimeout(() => setMessageError(null), 5000);
    }

    socket.on(EVENTS.MESSAGE_HISTORY, onHistory);
    socket.on(EVENTS.MESSAGE_RECEIVED, onNewMessage);
    socket.on(EVENTS.MESSAGE_ERROR, onMessageError);

    return () => {
      socket.off(EVENTS.MESSAGE_HISTORY, onHistory);
      socket.off(EVENTS.MESSAGE_RECEIVED, onNewMessage);
      socket.off(EVENTS.MESSAGE_ERROR, onMessageError);
      setMessages([]);
      setMessageError(null);
      setShowScrollButton(false);
    };
  }, [roomId]);

  // Auto-scroll to bottom when messages change, but only if near bottom.
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function sendMessage(text: string) {
    if (!roomId || !text.trim()) return;
    socket.emit(EVENTS.MESSAGE_SEND, { roomId, text: text.trim() });
    // Always scroll to bottom when the user themselves sends a message.
    isNearBottomRef.current = true;
    setShowScrollButton(false);
  }

  return {
    messages,
    sendMessage,
    bottomRef,
    scrollContainerRef,
    handleScroll,
    showScrollButton,
    scrollToBottom,
    messageError,
  };
}
```

- [ ] **Step 2: Verify the hook compiles**

Run: `npm run build --prefix client 2>&1 | head -30`

Expected: Build errors from `Chat.tsx` and `MessageList.tsx` because they don't yet consume the new props. That's fine — we'll update them in later tasks. The hook itself should have no type errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useMessages.ts
git commit -m "feat: smart auto-scroll + message error handling in useMessages"
```

---

## Task 2: Scroll-to-Bottom Button + Scroll Container (`MessageList.tsx`)

**Files:**
- Modify: `client/src/components/MessageList.tsx`

**Problem:** When the user scrolls up and new messages arrive, there's no way to jump back to the bottom. Also, the scroll container ref and scroll event need to be wired up from the hook.

**Solution:** Accept `scrollContainerRef`, `handleScroll`, `showScrollButton`, and `scrollToBottom` as props. Attach them to the scrollable div. Show a floating button when `showScrollButton` is true.

- [ ] **Step 1: Update MessageList to accept new props and render scroll button**

Replace the entire `client/src/components/MessageList.tsx` with:

```tsx
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
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
}

export function MessageList({
  messages,
  bottomRef,
  scrollContainerRef,
  onScroll,
  showScrollButton,
  onScrollToBottom,
}: MessageListProps) {
  const { username: currentUser } = useAuth();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.map((msg) => {
          const isMine = msg.username === currentUser;
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}
            >
              <span className="text-xs text-gray-400">{msg.username}</span>
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm break-words ${
                  isMine
                    ? 'bg-indigo-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-xs text-gray-300">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom floating button */}
      {showScrollButton && (
        <button
          onClick={onScrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-indigo-600 transition-colors"
          aria-label="Scroll to latest messages"
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
}
```

**Key change:** The outer div is `relative flex-1`, the scroll div is `absolute inset-0` — this ensures the scroll container fills the available space properly and `onScroll` fires correctly. The floating button is positioned absolutely at the bottom center.

- [ ] **Step 2: Verify the component compiles**

Run: `npm run build --prefix client 2>&1 | head -30`

Expected: Build error from `Chat.tsx` because it hasn't been updated to pass the new props yet. The component itself should have no type errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/MessageList.tsx
git commit -m "feat: scroll-to-bottom button in MessageList"
```

---

## Task 3: Character Limit + Counter (`MessageInput.tsx`)

**Files:**
- Modify: `client/src/components/MessageInput.tsx`

**Problem:** Server enforces a 1000-char limit but the client has no validation, no counter, and silently drops server-side rejections.

**Solution:** Add `maxLength={1000}` to the textarea. Show a character counter that turns red near the limit. Accept an optional `error` prop for displaying message errors from the hook.

- [ ] **Step 1: Update MessageInput with char limit, counter, and error display**

Replace the entire `client/src/components/MessageInput.tsx` with:

```tsx
import { useState, type KeyboardEvent } from 'react';

const MAX_LENGTH = 1000;
const WARN_THRESHOLD = 900;

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  error?: string | null;
}

export function MessageInput({ onSend, onTyping, onStopTyping, error }: MessageInputProps) {
  const [text, setText] = useState('');

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter (without Shift), new line on Shift+Enter.
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

  const charCount = text.length;
  const isOverWarn = charCount > WARN_THRESHOLD;
  const isAtLimit = charCount >= MAX_LENGTH;

  return (
    <div className="border-t border-gray-200 px-4 py-3 space-y-1">
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-32"
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="Type a message… (Enter to send)"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) onTyping();
            }}
            onKeyDown={handleKeyDown}
          />
          {charCount > 0 && (
            <span
              className={`absolute bottom-1 right-2 text-[10px] ${
                isAtLimit ? 'text-red-500 font-semibold' : isOverWarn ? 'text-amber-500' : 'text-gray-300'
              }`}
            >
              {charCount}/{MAX_LENGTH}
            </span>
          )}
        </div>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Run: `npm run build --prefix client 2>&1 | head -30`

Expected: No new errors from this component (the `error` prop is optional).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/MessageInput.tsx
git commit -m "feat: client-side char limit with counter on MessageInput"
```

---

## Task 4: Room Loading + Error State (`useRoom.ts`)

**Files:**
- Modify: `client/src/hooks/useRoom.ts`

**Problem:** `useRoom` doesn't expose a `joined` state (for loading) and logs room errors to the console instead of surfacing them to the UI.

**Solution:** Add `joined` (boolean) and `roomError` (string | null) states. `joined` starts `false` and becomes `true` on the first `ROOM_USERS` event. `roomError` auto-clears after 5 seconds.

- [ ] **Step 1: Update useRoom to expose joined and roomError**

Replace the `useRoom` function (lines 18–48) in `client/src/hooks/useRoom.ts` with:

```ts
// Handles joining/leaving a specific room and tracks the online users list.
// Server sends room:users whenever the user list changes.
export function useRoom(roomId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
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

    socket.on(EVENTS.ROOM_USERS, onRoomUsers);
    socket.on(EVENTS.ROOM_ERROR, onRoomError);

    return () => {
      socket.off(EVENTS.ROOM_USERS, onRoomUsers);
      socket.off(EVENTS.ROOM_ERROR, onRoomError);
      socket.emit(EVENTS.ROOM_LEAVE, { roomId });
    };
  }, [roomId]);

  return { onlineUsers, joined, roomError };
}
```

Note: Removed the `console.log('joining room', roomId)` and `console.log('leaving room', roomId)` debug statements.

- [ ] **Step 2: Verify the hook compiles**

Run: `npm run build --prefix client 2>&1 | head -30`

Expected: Build errors from `Chat.tsx` because it doesn't destructure `joined` / `roomError` yet.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useRoom.ts
git commit -m "feat: surface joined + roomError state from useRoom"
```

---

## Task 5: Reconnection Handling (`useSocket.ts`)

**Files:**
- Modify: `client/src/hooks/useSocket.ts`

**Problem:** Socket.IO auto-reconnects the transport, but the app doesn't know about it. There's no `connected` state used in the UI, and rooms aren't re-joined after a reconnect.

**Solution:** Expose `connected` from `useSocket()` (already tracked, just not consumed). Add a reconnection counter `reconnectCount` that increments on each reconnect — hooks like `useRoom` can react to this to re-join rooms. Expose this via a module-level event emitter pattern (simple callback).

Since `useSocket` runs at the App level and `useRoom` runs at the Chat page level, we need a way to signal reconnection. We'll use a simple module-level custom event on the socket object.

- [ ] **Step 1: Update useSocket to emit a custom reconnect event**

Replace the entire `client/src/hooks/useSocket.ts` with:

```ts
import { useEffect, useState } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';
import { useAuth } from '../context/AuthContext';

// Manages socket connection lifecycle tied to auth state.
// Connects when a token is present, disconnects on logout.
// Emits a custom '_app:reconnected' event so hooks can react to reconnections.
export function useSocket() {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    let wasConnected = false;

    socket.auth = { token };
    socket.connect();

    function onConnect() {
      setConnected(true);
      if (wasConnected) {
        // This is a REconnection, not the first connection.
        socket.emit('_app:reconnected');
      }
      wasConnected = true;
    }
    function onDisconnect() {
      setConnected(false);
    }

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

// Read-only hook for socket connection status.
// Use this in pages/components that need to show connection state
// without triggering connect/disconnect side effects.
export function useConnected() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
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
```

**Key change:** We track `wasConnected` inside the effect. The first `connect` event is normal connection. Subsequent `connect` events (after a disconnect) trigger `socket.emit('_app:reconnected')` — a client-only custom event that other hooks can listen to.

- [ ] **Step 2: Update useRoom to re-join on reconnection**

In `client/src/hooks/useRoom.ts`, update the `useRoom` function to listen for the `_app:reconnected` event and re-emit `ROOM_JOIN`:

Replace the `useRoom` function (the version from Task 4) with:

```ts
// Handles joining/leaving a specific room and tracks the online users list.
// Server sends room:users whenever the user list changes.
// Re-joins automatically on socket reconnection.
export function useRoom(roomId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
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
    socket.on('_app:reconnected', onReconnected);

    return () => {
      socket.off(EVENTS.ROOM_USERS, onRoomUsers);
      socket.off(EVENTS.ROOM_ERROR, onRoomError);
      socket.off('_app:reconnected', onReconnected);
      socket.emit(EVENTS.ROOM_LEAVE, { roomId });
    };
  }, [roomId]);

  return { onlineUsers, joined, roomError };
}
```

- [ ] **Step 3: Verify both hooks compile**

Run: `npm run build --prefix client 2>&1 | head -30`

Expected: Build errors only from `Chat.tsx` (not yet updated).

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useSocket.ts client/src/hooks/useRoom.ts
git commit -m "feat: reconnection handling — re-join rooms on socket reconnect"
```

---

## Task 6: Mobile-Responsive Online Users (`OnlineUsers.tsx`)

**Files:**
- Modify: `client/src/components/OnlineUsers.tsx`

**Problem:** The sidebar is always a fixed `w-48` visible block. On mobile, it takes up too much horizontal space.

**Solution:** Accept a `visible` prop and `onClose` prop. On mobile (below `md:`), it renders as a slide-over drawer with a backdrop. On desktop (`md:` and up), it renders as the normal sidebar. The parent (`Chat.tsx`) controls visibility via a toggle button — that's wired in Task 7.

- [ ] **Step 1: Update OnlineUsers to support drawer mode on mobile**

Replace the entire `client/src/components/OnlineUsers.tsx` with:

```tsx
import { useAuth } from '../context/AuthContext';

interface OnlineUsersProps {
  users: string[];
  visible: boolean;
  onClose: () => void;
}

export function OnlineUsers({ users, visible, onClose }: OnlineUsersProps) {
  const { username: currentUser } = useAuth();

  return (
    <>
      {/* Desktop: always-visible sidebar (md and up) */}
      <aside className="hidden md:flex w-48 border-l border-gray-200 flex-col">
        <SidebarContent users={users} currentUser={currentUser} />
      </aside>

      {/* Mobile: slide-over drawer (below md) */}
      {visible && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="absolute right-0 top-0 bottom-0 w-56 bg-white shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Online ({users.length})
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-sm"
                aria-label="Close user list"
              >
                ✕
              </button>
            </div>
            <UserList users={users} currentUser={currentUser} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({ users, currentUser }: { users: string[]; currentUser: string | null }) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Online ({users.length})
        </h3>
      </div>
      <UserList users={users} currentUser={currentUser} />
    </>
  );
}

function UserList({ users, currentUser }: { users: string[]; currentUser: string | null }) {
  return (
    <ul className="flex-1 overflow-y-auto py-2">
      {users.map((user) => (
        <li
          key={user}
          className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className={user === currentUser ? 'font-semibold' : ''}>
            {user}
            {user === currentUser && (
              <span className="ml-1 text-xs text-gray-400">(you)</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Run: `npm run build --prefix client 2>&1 | head -30`

Expected: Build error from `Chat.tsx` because `OnlineUsers` now requires `visible` and `onClose` props.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/OnlineUsers.tsx
git commit -m "feat: responsive OnlineUsers — sidebar on desktop, drawer on mobile"
```

---

## Task 7: Wire Everything in Chat.tsx

**Files:**
- Modify: `client/src/pages/Chat.tsx`

**Problem:** `Chat.tsx` needs to consume all the new state and props from tasks 1–6: smart scroll refs, loading state, error banners, reconnection banner, mobile sidebar toggle.

**Solution:** Full rewrite of `Chat.tsx` to wire all the new functionality together.

- [ ] **Step 1: Update Chat.tsx to wire all polish features**

Replace the entire `client/src/pages/Chat.tsx` with:

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnected } from '../hooks/useSocket';
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
  const connected = useConnected();

  const { onlineUsers, joined, roomError } = useRoom(roomId);
  const {
    messages,
    sendMessage,
    bottomRef,
    scrollContainerRef,
    handleScroll,
    showScrollButton,
    scrollToBottom,
    messageError,
  } = useMessages(roomId);
  const { typingUsers, notifyTyping, stopTyping } = useTyping(roomId);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSend(text: string) {
    sendMessage(text);
    stopTyping();
  }

  // Filter current user out of the typing indicator.
  const othersTyping = typingUsers.filter((u) => u !== username);

  // Loading state — show spinner until room is joined.
  if (!joined) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/rooms')}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Back to rooms"
          >
            ←
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Joining room…</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Connecting to room…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Connection lost banner */}
      {!connected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center shrink-0">
          Connection lost — reconnecting…
        </div>
      )}

      {/* Room error banner */}
      {roomError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-600 text-center shrink-0">
          {roomError}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/rooms')}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Back to rooms"
        >
          ←
        </button>
        <h1 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
          Room: <span className="font-mono text-xs text-gray-500">{roomId}</span>
        </h1>
        {/* Mobile: toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden text-xs text-gray-500 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"
          aria-label="Show online users"
        >
          Users ({onlineUsers.length})
        </button>
      </header>

      {/* Body: messages + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Message area */}
        <div className="flex flex-col flex-1 min-w-0">
          <MessageList
            messages={messages}
            bottomRef={bottomRef}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleScroll}
            showScrollButton={showScrollButton}
            onScrollToBottom={scrollToBottom}
          />
          <TypingIndicator users={othersTyping} />
          <MessageInput
            onSend={handleSend}
            onTyping={notifyTyping}
            onStopTyping={stopTyping}
            error={messageError}
          />
        </div>

        {/* Online users sidebar (desktop) + drawer (mobile) */}
        <OnlineUsers
          users={onlineUsers}
          visible={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  );
}
```

**What's new in this page:**
- **Loading state:** Shows spinner + "Connecting to room…" until `joined` is true
- **Connection-lost banner:** Shows amber banner when `!connected`
- **Room error banner:** Shows red banner when `roomError` is set
- **Mobile sidebar toggle:** A "Users (N)" button in the header (visible only below `md:`) toggles the drawer
- **Message error display:** Passes `messageError` to `MessageInput`
- **Smart scroll wiring:** Passes all scroll-related refs/callbacks to `MessageList`

- [ ] **Step 2: Full build check**

Run: `npm run build --prefix client`

Expected: Build succeeds with no errors. All hooks, components, and pages should now be consistent.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Chat.tsx
git commit -m "feat: wire all polish features in Chat page — loading, errors, mobile, scroll"
```

---

## Task 8: Final Verification + Tag

**Files:**
- None (verification only)

- [ ] **Step 1: Run full build**

Run: `npm run build --prefix client`

Expected: Clean build, no errors.

- [ ] **Step 2: Run lint check**

Run: `npm run lint --prefix client 2>&1 || true`

Fix any lint issues if present.

- [ ] **Step 3: Manual smoke test checklist**

Open the app in a browser and verify:

1. **Smart scroll:** Open a room, scroll up, have another user send a message — page should NOT auto-scroll. A "↓ New messages" button should appear.
2. **Scroll button:** Click the "↓ New messages" button — should smooth-scroll to bottom and button should disappear.
3. **Character limit:** Type in the message input — counter appears after first character. At 900+ chars, counter turns amber. At 1000, counter turns red and textarea stops accepting input.
4. **Mobile layout:** Resize browser below `md` (768px). Sidebar disappears. "Users (N)" button appears in header. Tap it — drawer slides in from right with backdrop.
5. **Loading state:** Navigate to a room — spinner shows briefly, then chat appears.
6. **Connection lost:** In DevTools Network tab, set to Offline — amber "Connection lost" banner appears. Go back Online — banner disappears, room state recovers.
7. **Error display:** Send a message over 1000 chars (bypass maxLength via DevTools) — red error text appears below the input.

- [ ] **Step 4: Commit and tag**

```bash
git add -A
git commit -m "chore: phase 3 polish complete — smart scroll, mobile layout, reconnection, errors"
git tag v0.2.0 -m "Phase 3: Polish — smart scroll, mobile responsive, reconnection, char limit, loading/error states"
```
