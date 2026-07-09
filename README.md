# Realtime Chat App

A hobby project built to learn how WebSockets work.

I'm building this purely for fun and education — no production goals, just exploring real-time communication concepts hands-on.

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

## Project Structure

```
├── client/               # React frontend (Vite + Tailwind)
│   ├── src/
│   └── dist/             # Built client output
├── server/               # Express + Socket.IO backend
│   ├── src/
│   │   ├── app.ts        # Express app factory
│   │   ├── socket/       # Socket.IO handlers
│   │   └── store/        # In-memory state management
│   └── dist/             # Compiled server output
├── shared/               # Shared TypeScript types
├── tests/                # Integration tests
└── package.json          # Root workspace configuration
```

## License

MIT — built for learning.
