import { Socket, Server } from "socket.io";
import { EVENTS, Message } from "../../types";
import {
  getUser,
  getRoom,
  addMessage,
  setTyping,
  getTypingUsernames,
} from "../../store";

const MAX_MESSAGE_LENGTH = 1000;

export function registerMessageHandlers(socket: Socket, io: Server): void {
  // ── message:send ───────────────────────────────────────────────────────────
  socket.on(
    EVENTS.MESSAGE_SEND,
    ({ roomId, text }: { roomId: string; text: string }) => {
      const user = getUser(socket.id);
      const room = getRoom(roomId);

      if (!user) {
        socket.emit(EVENTS.MESSAGE_ERROR, { message: "Not authenticated" });
        return;
      }
      if (!room) {
        socket.emit(EVENTS.MESSAGE_ERROR, { message: "Room not found" });
        return;
      }
      if (!user.rooms.includes(roomId)) {
        socket.emit(EVENTS.MESSAGE_ERROR, {
          message: "You are not in this room",
        });
        return;
      }
      if (!text || typeof text !== "string" || !text.trim()) {
        socket.emit(EVENTS.MESSAGE_ERROR, {
          message: "Message cannot be empty",
        });
        return;
      }
      if (text.length > MAX_MESSAGE_LENGTH) {
        socket.emit(EVENTS.MESSAGE_ERROR, {
          message: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit`,
        });
        return;
      }

      const message: Omit<Message, "reactions"> = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        roomId,
        userId: socket.id,
        username: user.username,
        text: text.trim(),
        timestamp: new Date(),
      };

      addMessage(message);
      io.to(roomId).emit(EVENTS.MESSAGE_RECEIVED, message);
    },
  );

  // ── typing:start ───────────────────────────────────────────────────────────
  socket.on(EVENTS.TYPING_START, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user || !user.rooms.includes(roomId)) return;

    setTyping(roomId, socket.id, true);
    socket
      .to(roomId)
      .emit(EVENTS.TYPING_UPDATE, {
        roomId,
        users: getTypingUsernames(roomId),
      });
  });

  // ── typing:stop ────────────────────────────────────────────────────────────
  socket.on(EVENTS.TYPING_STOP, ({ roomId }: { roomId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    setTyping(roomId, socket.id, false);
    socket
      .to(roomId)
      .emit(EVENTS.TYPING_UPDATE, {
        roomId,
        users: getTypingUsernames(roomId),
      });
  });
}
