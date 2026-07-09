# Realtime Chat App

A hobby project built to learn how WebSockets work.

I'm building this purely for fun and education — no production goals, just exploring real-time communication concepts hands-on.

## Stack

- **Server:** Node.js with Express and Socket.IO
- **Client:** React 19 + TypeScript + Vite + TailwindCSS
- **State:** Redis (via Upstash) for cross-instance persistence
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
| `REDIS_URL` | Redis connection string | *(required for Vercel)* |
| `SOCKET_TRANSPORTS` | Server Socket.IO transports | `websocket,polling` |
| `VITE_SOCKET_TRANSPORTS` | Client Socket.IO transports | `websocket,polling` |

## Deploying to Vercel

### Prerequisites

1. A [Vercel](https://vercel.com) account
2. An [Upstash](https://upstash.com) account (free tier works perfectly)

### Step 1: Set up Redis

1. Go to [Upstash Console](https://console.upstash.com) and create a new Redis database
2. Copy the **Redis URL** (starts with `redis://` or `rediss://`)
3. You'll need this for the environment variables in Step 3

### Step 2: Configure Vercel

1. Push this repo to GitHub/GitLab/Bitbucket
2. Import the project in the [Vercel Dashboard](https://vercel.com/dashboard)
3. In the project settings, add these **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `JWT_SECRET` | Generate a strong random string (e.g., `openssl rand -base64 32`) |
   | `REDIS_URL` | Your Upstash Redis URL |
   | `SOCKET_TRANSPORTS` | `polling` |
   | `VITE_SOCKET_TRANSPORTS` | `polling` |

4. Deploy!

### Step 3: Verify deployment

After deployment, your app will be available at `https://your-project.vercel.app`:

- The React frontend loads from Vercel's CDN
- Socket.IO connects via HTTP long-polling to the serverless function
- Chat state persists in Redis across function invocations

### How it works

Vercel's serverless functions are **stateless** — each request may hit a completely fresh process. Without Redis:

- User A sends a message → stored in memory on Instance A
- User B polls for messages → request hits Instance B → message is gone

With Redis, all users, rooms, and messages are stored in a central database, so state persists across all function instances.

### Important notes

- **WebSockets:** Not supported on Vercel's standard serverless platform. Socket.IO automatically falls back to HTTP long-polling, which works perfectly.
- **Redis adapter:** The `@socket.io/redis-adapter` package broadcasts Socket.IO events across all running Vercel instances, ensuring real-time updates reach everyone.
- **Free tier limits:** Upstash's free tier (10,000 commands/day) is plenty for a hobby project. If you hit limits, the app gracefully falls back to in-memory mode (but state won't persist across instances).

### Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Link project
vercel

# Deploy
vercel --prod
```

## Project Structure

```
├── api/                  # Vercel serverless entry point (Express app)
├── client/               # React frontend (Vite + Tailwind)
│   ├── src/
│   └── dist/             # Built client output
├── server/               # Express + Socket.IO backend
│   ├── src/
│   │   ├── redis.ts      # Redis client configuration
│   │   ├── store/        # Redis-backed state management
│   │   ├── socket/       # Socket.IO handlers
│   │   └── app.ts        # Express app factory
│   └── dist/             # Compiled server output
├── shared/               # Shared TypeScript types
├── tests/                # Integration tests
├── vercel.json           # Vercel routing configuration
└── package.json          # Root workspace configuration
```

## License

MIT — built for learning.
