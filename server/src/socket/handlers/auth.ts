import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { EVENTS, JwtPayload } from "../../types";
import { addUser, getUserByUsername } from "../../store";

export function registerAuthHandlers(socket: Socket): void {
  socket.on(EVENTS.AUTH_LOGIN, ({ username }: { username: string }) => {
    if (!username || typeof username !== "string" || !username.trim()) {
      socket.emit(EVENTS.AUTH_ERROR, { message: "Username is required" });
      return;
    }

    const trimmed = username.trim();

    if (getUserByUsername(trimmed)) {
      socket.emit(EVENTS.AUTH_ERROR, { message: "Username already taken" });
      return;
    }

    const user = addUser(socket.id, trimmed);
    const payload: JwtPayload = { userId: user.id, username: user.username };
    const secret = process.env.JWT_SECRET ?? "fallback_secret";
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });

    socket.emit(EVENTS.AUTH_TOKEN, { token, userId: user.id });
  });
}
