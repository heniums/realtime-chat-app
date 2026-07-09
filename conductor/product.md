# Product Guide: Realtime Chat App

## Vision
A hands-on hobby project built purely for fun and education to explore how WebSockets enable real-time communication. The goal is to learn by building — understanding connection lifecycle, message broadcasting, room management, and live user presence — without production-scale ambitions.

## Target Users
- **Primary:** The developer themselves, as a learning vehicle.
- **Secondary:** Friends or peers who might join to test the chat functionality.

## Core Goals
1. **Learn WebSocket fundamentals:** Establish and maintain persistent connections between client and server.
2. **Master room-based messaging:** Create, join, and leave chat rooms; broadcast messages only to room members.
3. **Implement live presence:** Show who is online and track typing activity in real time.
4. **Experiment with real-time UX:** Add lightweight interactions like emoji reactions to messages.

## Key Features
- **Authentication:** Simple username-based login with JWT token issuance.
- **Room Management:** Create public chat rooms, join/leave rooms, list available rooms.
- **Real-time Messaging:** Send and receive messages within a room with full message history on join.
- **Typing Indicators:** See when other users are actively typing.
- **Message Reactions:** Add/remove emoji reactions on individual messages.
- **Online Presence:** View the list of users currently in a room.

## Non-Goals
- End-to-end encryption
- Message persistence beyond in-memory store
- Scalability to thousands of concurrent users
- Mobile-native applications

## Design Direction
- **UI Style:** Minimal, modern, and clean. Dark-mode friendly.
- **UX Priority:** Instant feedback — messages, typing status, and reactions should feel immediate.
- **Tech Alignment:** React functional components with hooks; TailwindCSS for rapid styling; Socket.IO for bidirectional events.
