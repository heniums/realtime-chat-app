import { type RefObject } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { ReactionPicker } from './ReactionPicker';
import { MessageReactions } from './MessageReactions';
import socket from '../socket/client';
import type { Message, Reaction } from '../../../shared/types';

interface MessageListProps {
  messages: Message[];
  bottomRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export function MessageList({
  messages,
  bottomRef,
  scrollContainerRef,
  onScroll,
  showScrollButton,
  onScrollToBottom,
  onAddReaction,
  onRemoveReaction,
}: MessageListProps) {
  const { username: currentUser } = useAuth();
  const currentSocketId = socket.id ?? '';

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages yet. Say hello!
      </div>
    );
  }

  function handleReactionToggle(messageId: string, emoji: string, reactions: Reaction[]) {
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing && existing.userIds.includes(currentSocketId)) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
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
              className={clsx('group flex flex-col gap-1', {
                'items-end': isMine,
                'items-start': !isMine,
              })}
            >
              <span className="text-xs text-gray-400">{msg.username}</span>
              <div className="flex items-center gap-1">
                {isMine && (
                  <ReactionPicker
                    onSelect={(emoji) => onAddReaction(msg.id, emoji)}
                  />
                )}
                <div
                  className={clsx(
                    'max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm wrap-break-words',
                    {
                      'bg-indigo-500 text-white rounded-br-sm': isMine,
                      'bg-gray-100 text-gray-900 rounded-bl-sm': !isMine,
                    },
                  )}
                >
                  {msg.text}
                </div>
                {!isMine && (
                  <ReactionPicker
                    onSelect={(emoji) => onAddReaction(msg.id, emoji)}
                  />
                )}
              </div>
              <MessageReactions
                reactions={msg.reactions ?? []}
                currentUserId={currentSocketId}
                onToggle={(emoji) => handleReactionToggle(msg.id, emoji, msg.reactions ?? [])}
              />
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
