import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { initSocket } from "./socket";

export interface AppBundle {
  app: express.Application;
  server: ReturnType<typeof createServer>;
}

export function createApp(): AppBundle {
  const app = express();
  const server = createServer(app);

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  initSocket(server);

  // Serve built client static files in production (when CLIENT_DIST_PATH is set)
  const clientDistPath = process.env.CLIENT_DIST_PATH;
  if (clientDistPath) {
    const absoluteClientDist = path.resolve(clientDistPath);
    app.use(express.static(absoluteClientDist));

    // SPA catch-all: serve index.html for any non-API route
    app.use((_req, res) => {
      res.sendFile(path.join(absoluteClientDist, "index.html"));
    });
  }

  return { app, server };
}
