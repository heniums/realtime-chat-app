import "dotenv/config";
import { createApp } from "./app";

const { server } = createApp();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
server.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
