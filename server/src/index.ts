import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import { initSocket } from "./socket";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

initSocket(httpServer);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
