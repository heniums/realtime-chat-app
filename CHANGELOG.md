# Changelog

All notable changes to this project will be documented here.

## [v0.4.5] - 2026-04-17

### Added

- Client Dockerfile with multi-stage build (Node build + nginx serve)
- nginx.conf with SPA routing support

### Fixed

- Fix ineffective dynamic import warning for emoji-picker-react

## [v0.4.3] - 2026-04-17

### Fixed

- Hang in room when room doesn't exist

## [v0.4.2] - 2026-04-17

### Fixed

- Unwrapped long message display

## [v0.4.1] - 2026-04-17

### Added

- Dockerfile for containerized deployment

### Changed

- Shared types and events between client/server
- Use `clsx` for component class composition

### Docs

- Technical debts notes (2026-04-16)

## [v0.4.0] - 2026-04-16

### Added

- Basic emoji support with emoji picker
- Monochrome icon for add emoji button

### Docs

- Emoji plan documentation

## [v0.3.0] - 2026-04-16

### Added

- User online status tracking
- Room rejoin after disconnect
- Store auth in `sessionStorage` with graceful delay before user deletion

### Changed

- Rename `ROOM_LIST_RESPONSE` wire string to `room:listed` for consistency

## [v0.2.0] - 2026-04-14

### Added

- JWT auth middleware for reconnection (verify token, re-register user on connect)
- Reconnection handling — re-join rooms on socket reconnect
- Smart auto-scroll and message error handling in `useMessages`
- Scroll-to-bottom button in `MessageList`
- Client-side character limit with counter on `MessageInput`
- Surface `joined` and `roomError` state from `useRoom`
- Responsive `OnlineUsers` — sidebar on desktop, drawer on mobile
- Wire all polish features in Chat page (loading, errors, mobile, scroll)
- Front-end basic client (React)

### Fixed

- Use socket `connect` event for reconnection instead of custom event
- Resolve `react-hooks/set-state-in-effect` lint error in `useRoom`

### Changed

- Extract `_app:reconnected` to `EVENTS.APP_RECONNECTED` constant
- Add `CONNECTION`/`CONNECT`/`DISCONNECT` constants to server `EVENTS`, replace magic strings
- Add `CONNECT`/`DISCONNECT` constants to client `EVENTS`, replace magic strings

### Docs

- Phase 3 documentation

## [v0.1.3] - 2026-04-14

### Docs

- Front-end documentation

## [v0.1.2] - 2026-04-14

### Docs

- Add README and CHANGELOG

## [v0.1.1] - 2026-04-14

### Fixed

- Room was immediately deleted when a user first joined in dev mode

## [v0.1.0] - 2026-04-14

### Added

- Back-end core with Socket.IO (rooms, messaging, typing indicators)
- Phase 1 & 2 documentation
