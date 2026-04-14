import { type RefObject } from 'react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
  bottomRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
}

export function MessageList({
  messages,
  bottomRef,
  scrollContainerRef,
  onScroll,
  showScrollButton,
  onScrollToBottom,
}: MessageListProps) {
  const { username: currentUser } = useAuth();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.map((msg) => {
          const isMine = msg.username === currentUser;
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}
            >
              <span className="text-xs text-gray-400">{msg.username}</span>
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm break-words ${
                  isMine
                    ? 'bg-indigo-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-xs text-gray-300">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom floating button */}
      {showScrollButton && (
        <button
          onClick={onScrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-indigo-600 transition-colors"
          aria-label="Scroll to latest messages"
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
}
