import { useEffect, useState, useRef } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';

const TYPING_DEBOUNCE_MS = 1500;

// Manages outgoing typing events (debounced) and incoming typing:update events.
export function useTyping(roomId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    function onTypingUpdate({ roomId: rid, users }: { roomId: string; users: string[] }) {
      if (rid === roomId) setTypingUsers(users);
    }

    socket.on(EVENTS.TYPING_UPDATE, onTypingUpdate);

    return () => {
      socket.off(EVENTS.TYPING_UPDATE, onTypingUpdate);
      setTypingUsers([]);
    };
  }, [roomId]);

  // Call this whenever the user types a character.
  function notifyTyping() {
    if (!roomId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(EVENTS.TYPING_START, { roomId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(EVENTS.TYPING_STOP, { roomId });
    }, TYPING_DEBOUNCE_MS);
  }

  // Call this when the user submits a message (stop immediately).
  function stopTyping() {
    if (!roomId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit(EVENTS.TYPING_STOP, { roomId });
    }
  }

  return { typingUsers, notifyTyping, stopTyping };
}
