import { useEffect, useState, useRef, useCallback } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';

interface Reaction {
  emoji: string;
  userIds: string[];
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  reactions: Reaction[];
}

const NEAR_BOTTOM_THRESHOLD = 100;

// Manages the message list for a room.
// History arrives via message:history when the room is joined.
// New messages arrive via message:received in real time.
export function useMessages(roomId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const hasNewMessageRef = useRef(false);

  // Check if the user is near the bottom of the scroll container.
  const checkNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  // Scroll event handler — update near-bottom state and hide scroll button.
  const handleScroll = useCallback(() => {
    const nearBottom = checkNearBottom();
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowScrollButton(false);
      hasNewMessageRef.current = false;
    }
  }, [checkNearBottom]);

  // Scroll to bottom programmatically.
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
    hasNewMessageRef.current = false;
  }, []);

  useEffect(() => {
    if (!roomId) return;

    function onHistory(msgs: Message[]) {
      setMessages(msgs ?? []);
      // Always scroll to bottom on initial history load.
      isNearBottomRef.current = true;
      hasNewMessageRef.current = false;
      setShowScrollButton(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
    function onNewMessage(msg: Message) {
      if (msg.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
        if (!isNearBottomRef.current) {
          hasNewMessageRef.current = true;
          setShowScrollButton(true);
        }
      }
    }
    function onMessageError({ message }: { message: string }) {
      setMessageError(message);
      setTimeout(() => setMessageError(null), 5000);
    }
    function onReactionUpdated({
      messageId,
      reactions,
    }: {
      roomId: string;
      messageId: string;
      reactions: Reaction[];
    }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      );
    }

    socket.on(EVENTS.MESSAGE_HISTORY, onHistory);
    socket.on(EVENTS.MESSAGE_RECEIVED, onNewMessage);
    socket.on(EVENTS.MESSAGE_ERROR, onMessageError);
    socket.on(EVENTS.REACTION_UPDATED, onReactionUpdated);

    return () => {
      socket.off(EVENTS.MESSAGE_HISTORY, onHistory);
      socket.off(EVENTS.MESSAGE_RECEIVED, onNewMessage);
      socket.off(EVENTS.MESSAGE_ERROR, onMessageError);
      socket.off(EVENTS.REACTION_UPDATED, onReactionUpdated);
      setMessages([]);
      setMessageError(null);
      setShowScrollButton(false);
    };
  }, [roomId]);

  // Auto-scroll to bottom when messages change, but only if near bottom.
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function sendMessage(text: string) {
    if (!roomId || !text.trim()) return;
    socket.emit(EVENTS.MESSAGE_SEND, { roomId, text: text.trim() });
    isNearBottomRef.current = true;
    setShowScrollButton(false);
  }

  function addReaction(messageId: string, emoji: string) {
    if (!roomId) return;
    socket.emit(EVENTS.REACTION_ADD, { roomId, messageId, emoji });
  }

  function removeReaction(messageId: string, emoji: string) {
    if (!roomId) return;
    socket.emit(EVENTS.REACTION_REMOVE, { roomId, messageId, emoji });
  }

  return {
    messages,
    sendMessage,
    addReaction,
    removeReaction,
    bottomRef,
    scrollContainerRef,
    handleScroll,
    showScrollButton,
    scrollToBottom,
    messageError,
  };
}
