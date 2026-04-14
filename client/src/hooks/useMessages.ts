import { useEffect, useState, useRef } from 'react';
import socket from '../socket/client';
import { EVENTS } from '../socket/events';

interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

// Manages the message list for a room.
// History arrives via message:history when the room is joined.
// New messages arrive via message:received in real time.
export function useMessages(roomId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    function onHistory(msgs: Message[]) {
      setMessages(msgs ?? []);
    }
    function onNewMessage(msg: Message) {
      if (msg.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    }

    socket.on(EVENTS.MESSAGE_HISTORY, onHistory);
    socket.on(EVENTS.MESSAGE_RECEIVED, onNewMessage);

    return () => {
      socket.off(EVENTS.MESSAGE_HISTORY, onHistory);
      socket.off(EVENTS.MESSAGE_RECEIVED, onNewMessage);
      setMessages([]);
    };
  }, [roomId]);

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text: string) {
    if (!roomId || !text.trim()) return;
    socket.emit(EVENTS.MESSAGE_SEND, { roomId, text: text.trim() });
  }

  return { messages, sendMessage, bottomRef };
}
