import { createApp } from "../server/src/app";

const { server } = createApp();

/**
 * Vercel serverless entry point.
 *
 * Socket.IO is attached to an internal Node.js HTTP server created inside
 * `createApp()`. Vercel invokes this handler for every HTTP request, so we
 * emit the 'request' event on that internal server. This triggers both the
 * Express application and Socket.IO's engine listeners, allowing the polling
 * transport to work in a serverless environment.
 *
 * Note: WebSocket transport is not supported on Vercel's serverless runtime.
 * The client and server are configured to fall back to HTTP long-polling.
 */
export default (req: any, res: any): void => {
  server.emit("request", req, res);
};
