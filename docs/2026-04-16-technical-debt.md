# Technical Debt

Tracked items for future improvement. Each entry notes the scope, current state, and suggested fix.

---

## TD-001: Adopt `clsx` for conditional classNames across existing components

- **Scope:** All client components with template-literal className conditionals
- **Current state:** `clsx` was introduced with the emoji reaction feature (Step 6). Only `MessageReactions.tsx` and `MessageList.tsx` use it. Pre-existing components (`MessageInput.tsx`, `TypingIndicator.tsx`, `OnlineUsers.tsx`, `Chat.tsx`) still use template-literal concatenation.
- **Suggested fix:** Refactor all conditional `className` strings to use `clsx` for consistency and readability.
- **Priority:** Low

## TD-002: Lazy-load emoji picker to reduce bundle size

- **Scope:** `client/src/components/ReactionPicker.tsx`
- **Current state:** `emoji-picker-react` is statically imported, adding ~400KB to the main bundle. Vite build warns about chunk size exceeding 500KB.
- **Suggested fix:** Use `React.lazy()` + `Suspense` to code-split the emoji picker so it only loads when a user clicks the reaction button.
- **Priority:** Medium

## TD-003: Shared type definitions between server and client

- **Scope:** `server/src/types/index.ts`, `client/src/hooks/useMessages.ts`, `client/src/components/MessageList.tsx`, `client/src/components/MessageReactions.tsx`
- **Current state:** `Message`, `Reaction`, and `EVENTS` types are duplicated manually across server and client. The client has its own inline interfaces that must be kept in sync.
- **Suggested fix:** Extract shared types into a `shared/` package or use a monorepo workspace to share types between server and client.
- **Priority:** Medium
