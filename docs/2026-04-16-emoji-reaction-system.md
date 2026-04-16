# Emoji Reaction System Plan

**Date:** 2026-04-16
**Status:** Draft
**Scope:** Emoji reactions on chat messages

## Overview

Add emoji reactions to messages in the realtime chat app. Users can react to any message with an emoji via a picker, and reactions sync in realtime across all clients via Socket.IO.

## Library Choice: emoji-picker-react

**Why:** Highest benchmark score (88.8), pure React component, built-in dark/light theming, custom emoji support, excellent TypeScript types. Single package install — no separate data package needed.

```sh
npm install emoji-picker-react
```

## Data Model

### New type: `Reaction`

```ts
// server/src/types/index.ts
export interface Reaction {
  emoji: string;       // unified emoji character (e.g. "👍")
  userIds: string[];   // users who reacted with this emoji
}
```

### Updated `Message` interface

```ts
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  reactions: Reaction[];  // NEW — default: []
}
```

## Socket Events

### New events to add to `EVENTS`

```ts
// Client → Server
REACTION_ADD: "reaction:add",
REACTION_REMOVE: "reaction:remove",

// Server → Client
REACTION_UPDATED: "reaction:updated",
```

### Payloads

- **`reaction:add`** — `{ messageId: string, emoji: string }`
- **`reaction:remove`** — `{ messageId: string, emoji: string }`
- **`reaction:updated`** — `{ messageId: string, reactions: Reaction[] }` (broadcast to room)

## Server Changes

### 1. New handler: `server/src/socket/handlers/reaction.ts`

- **`handleReactionAdd`**: Find message in store by ID, add userId to the matching emoji's `userIds` array (or create new Reaction entry). Broadcast `reaction:updated` to the room.
- **`handleReactionRemove`**: Remove userId from the emoji's `userIds`. If `userIds` is empty, remove the Reaction entry. Broadcast `reaction:updated`.
- Validate: message must exist, user must be in the room, max 20 unique emojis per message.

### 2. Store updates: `server/src/store/index.ts`

- Messages already stored in memory. No schema change needed beyond initializing `reactions: []` on new messages.
- Add helper functions: `addReaction(messageId, emoji, userId)`, `removeReaction(messageId, emoji, userId)`.

### 3. Wire up in `server/src/socket/index.ts`

- Register `reaction:add` and `reaction:remove` listeners on socket connection.

## Client Changes

### 1. New component: `client/src/components/MessageReactions.tsx`

Renders reaction badges below each message bubble:
- Each badge shows: emoji + count (e.g. "👍 3")
- Highlight badge if current user has reacted
- Click badge to toggle own reaction (add/remove)

### 2. New component: `client/src/components/ReactionPicker.tsx`

- Wraps `emoji-picker-react` in a popover/dropdown
- Triggered by a "+" or smiley button on message hover
- On emoji select: emit `reaction:add` via socket
- Compact mode — use `reactionsDefaultOpen` or small picker size

### 3. Update `MessageList.tsx`

- Render `<MessageReactions>` below each message bubble
- Show reaction trigger button on message hover

### 4. New hook: `client/src/hooks/useReactions.ts`

- Listen to `reaction:updated` events from socket
- Maintain a `Map<messageId, Reaction[]>` state
- Provide `addReaction(messageId, emoji)` and `removeReaction(messageId, emoji)` functions
- Initialize from message history (reactions already on Message objects)

### 5. Update `client/src/socket/events.ts`

- Add `REACTION_ADD`, `REACTION_REMOVE`, `REACTION_UPDATED` event constants (mirror server).

## UI/UX Details

- **Trigger:** Hover over message shows a small "+" reaction button (right side of bubble)
- **Picker position:** Popover anchored to the trigger button, opens upward to avoid overflow
- **Badge layout:** Horizontal row of reaction badges below the message bubble, wrapping if many
- **Active state:** If current user reacted, badge has a highlighted border (e.g. indigo ring matching existing theme)
- **Animations:** Subtle scale-in on new reaction appearance
- **Theme:** Match existing Tailwind dark/light — pass `Theme.AUTO` to emoji-picker-react
- **Mobile:** Tap (not hover) to show reaction button; long-press could be a future enhancement

## File Inventory

**New files:**
- `server/src/socket/handlers/reaction.ts`
- `client/src/components/MessageReactions.tsx`
- `client/src/components/ReactionPicker.tsx`
- `client/src/hooks/useReactions.ts`

**Modified files:**
- `server/src/types/index.ts` — add Reaction type, update Message, add events
- `server/src/store/index.ts` — reaction helper functions, init reactions on messages
- `server/src/socket/index.ts` — register reaction handlers
- `client/src/components/MessageList.tsx` — render reactions + hover trigger
- `client/src/socket/events.ts` — add reaction event constants
- `client/package.json` — add emoji-picker-react dependency

## Implementation Order

1. **Types & events** — Add Reaction type and socket events (server + client)
2. **Server store** — Add reaction helper functions
3. **Server handler** — Create reaction.ts handler + wire up
4. **Client hook** — useReactions with socket listeners
5. **Client components** — ReactionPicker + MessageReactions
6. **Integration** — Wire into MessageList, test end-to-end
7. **Polish** — Animations, edge cases, theme matching

## Constraints & Limits

- Max 20 unique emoji reactions per message
- One reaction per emoji per user (toggle behavior)
- No reaction notifications (out of scope)
- No custom emoji (out of scope for v1)
- In-memory store — reactions lost on server restart (same as messages)
