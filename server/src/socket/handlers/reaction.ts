import { Socket, Server } from "socket.io";
import { EVENTS } from "../../types";
import { getUser, addReaction, removeReaction } from "../../store";

interface ReactionPayload {
  roomId: string;
  messageId: string;
  emoji: string;
}

export function registerReactionHandlers(socket: Socket, io: Server): void {
  socket.on(EVENTS.REACTION_ADD, ({ roomId, messageId, emoji }: ReactionPayload) => {
    const user = getUser(socket.id);
    if (!user || !user.rooms.includes(roomId)) return;

    const reactions = addReaction(roomId, messageId, emoji, socket.id);
    if (reactions) {
      io.to(roomId).emit(EVENTS.REACTION_UPDATED, { roomId, messageId, reactions });
    }
  });

  socket.on(EVENTS.REACTION_REMOVE, ({ roomId, messageId, emoji }: ReactionPayload) => {
    const user = getUser(socket.id);
    if (!user || !user.rooms.includes(roomId)) return;

    const reactions = removeReaction(roomId, messageId, emoji, socket.id);
    if (reactions) {
      io.to(roomId).emit(EVENTS.REACTION_UPDATED, { roomId, messageId, reactions });
    }
  });
}
