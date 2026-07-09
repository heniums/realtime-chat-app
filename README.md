# Realtime Chat App

A hobby project built to learn how WebSockets work.

I'm building this purely for fun and education — no production goals, just exploring real-time communication concepts hands-on.

> ⚠️ **Important Deployment Note:** This project is designed to run as a single Node.js process where the Express server hosts both the Socket.IO backend and the built React frontend. It works perfectly in local development and on traditional hosting (single-instance VPS, Railway, Render, Fly.io, etc.). **Vercel serverless deployment is NOT supported for the real-time chat features** due to the architecture mismatch explained below.

## What I'm learning

- How WebSocket connections are established and maintained
- Managing rooms and broadcasting messages to specific groups
- Handling user presence and typing indicators in real time
- Structuring a Node.js server alongside a basic frontend client

## Stack

- **Server:** Node.js with Express and Socket.IO
- **Client:** React 19 + TypeScript + Vite + TailwindCSS
- **Architecture:** npm workspaces (client + server)

## Running locally

```bash
# Install dependencies for both workspaces
npm install

# Start both client and server concurrently in development mode
npm run dev

# Build both client and server for production
npm run build

# Start the production server (serves built client on the same port)
CLIENT_DIST_PATH=../client/dist npm start

# Run integration tests
npm test
```

## Environment Variables

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `JWT_SECRET` | JWT signing secret | *(required)* |
| `CLIENT_ORIGIN` | CORS origin for dev | `http://localhost:5173` |
| `VITE_SERVER_URL` | Client → server URL in dev | `http://localhost:3001` |
| `SOCKET_TRANSPORTS` | Server Socket.IO transports | `websocket,polling` |
| `VITE_SOCKET_TRANSPORTS` | Client Socket.IO transports | `websocket,polling` |

## Why Not Vercel?

**Short answer:** Vercel's serverless functions are stateless and short-lived. Socket.IO requires persistent session state across multiple HTTP requests. When you "log in" via Socket.IO polling, the handshake happens on Instance A, but the next poll request may hit Instance B — which doesn't know about your session. The result: chat features (messages, rooms, typing indicators) simply don't work.

**The technical mismatch:**

| Requirement | Socket.IO Polling | Vercel Serverless |
|-------------|-------------------|-------------------|
| Session persistence | Handshake creates `sid`, subsequent polls reference it | Each request may hit a cold function with no memory |
| Connection lifecycle | Long-lived connection over multiple HTTP requests | Single request/response, function freezes after |
| Real-time broadcasting | Maintains internal room state | State is reset on every invocation |

**Viable alternatives for deployment:**

- **[Railway](https://railway.app)** — Deploy the whole repo as a single Node.js service
- **[Render](https://render.com)** — Web service with persistent Node.js process
- **[Fly.io](https://fly.io)** — Run the container close to users with persistent state
- **Any VPS / Docker host** — Single-instance deployment works perfectly

For these platforms, the `vercel.json` and `api/` directory can be ignored — simply run `npm install && npm run build && CLIENT_DIST_PATH=../client/dist npm start`.

## Project Structure

```
├── api/                  # Vercel serverless entry point (kept for reference, not functional)
├── client/               # React frontend (Vite + Tailwind)
│   ├── src/
│   └── dist/             # Built client output
├── server/               # Express + Socket.IO backend
│   ├── src/
│   └── dist/             # Compiled server output
├── shared/               # Shared TypeScript types
├── conductor/            # Conductor project management
├── tests/                # Integration tests
├── vercel.json           # Vercel config (kept for reference, not functional)
└── package.json          # Root workspace configuration
```

## License

MIT — built for learning.
