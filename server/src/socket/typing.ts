/**
 * Typing indicators — the single piece of presence state we keep in-memory.
 *
 * Typing state is ephemeral, fires dozens of events per second, and carries
 * no value after the user stops typing. Persisting it would be absurd.
 */

const typingByRoom = new Map<string, Set<string>>(); // roomId → Set<userId>

export function setTyping(
  roomId: string,
  userId: string,
  isTyping: boolean,
): void {
  let set = typingByRoom.get(roomId);
  if (isTyping) {
    if (!set) {
      set = new Set();
      typingByRoom.set(roomId, set);
    }
    set.add(userId);
  } else if (set) {
    set.delete(userId);
    if (set.size === 0) typingByRoom.delete(roomId);
  }
}

export function getTypingUserIds(roomId: string): string[] {
  const set = typingByRoom.get(roomId);
  return set ? Array.from(set) : [];
}

/**
 * Remove a user from every room's typing set. Called on disconnect so a
 * disconnected-while-typing user doesn't appear as permanently typing.
 */
export function clearTypingForUser(userId: string): void {
  for (const [roomId, set] of typingByRoom) {
    if (set.delete(userId) && set.size === 0) {
      typingByRoom.delete(roomId);
    }
  }
}
