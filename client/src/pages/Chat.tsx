import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnected } from '../hooks/useSocket';
import { useRoom } from '../hooks/useRoom';
import { useMessages } from '../hooks/useMessages';
import { useTyping } from '../hooks/useTyping';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { OnlineUsers } from '../components/OnlineUsers';
import { TypingIndicator } from '../components/TypingIndicator';
import { USER_STATUS } from '../socket/events';

export default function Chat() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { username } = useAuth();
  const connected = useConnected();

  const { onlineUsers, joined, roomError, roomNotFound } = useRoom(roomId);
  const {
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
  } = useMessages(roomId);
  const { typingUsers, notifyTyping, stopTyping } = useTyping(roomId);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSend(text: string) {
    sendMessage(text);
    stopTyping();
  }

  // Filter current user out of the typing indicator.
  const othersTyping = typingUsers.filter((u) => u !== username);

  // Room not found — show message with link back to rooms.
  if (roomNotFound) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/rooms')}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Back to rooms"
          >
            ←
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Room not found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <p className="text-sm">This room doesn't exist or has been deleted.</p>
            <button
              onClick={() => navigate('/rooms')}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              ← Back to rooms
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state — show spinner until room is joined.
  if (!joined) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/rooms')}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Back to rooms"
          >
            ←
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Joining room…</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Connecting to room…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Connection lost banner */}
      {!connected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center shrink-0">
          Connection lost — reconnecting…
        </div>
      )}

      {/* Room error banner */}
      {roomError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-600 text-center shrink-0">
          {roomError}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/rooms')}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Back to rooms"
        >
          ←
        </button>
        <h1 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
          Room: <span className="font-mono text-xs text-gray-500">{roomId}</span>
        </h1>
        {/* Mobile: toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden text-xs text-gray-500 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"
          aria-label="Show online users"
        >
          Users ({onlineUsers.filter((u) => u.status === USER_STATUS.ONLINE).length})
        </button>
      </header>

      {/* Body: messages + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Message area */}
        <div className="flex flex-col flex-1 min-w-0">
          <MessageList
            messages={messages}
            bottomRef={bottomRef}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleScroll}
            showScrollButton={showScrollButton}
            onScrollToBottom={scrollToBottom}
            onAddReaction={addReaction}
            onRemoveReaction={removeReaction}
          />
          <TypingIndicator users={othersTyping} />
          <MessageInput
            onSend={handleSend}
            onTyping={notifyTyping}
            onStopTyping={stopTyping}
            error={messageError}
          />
        </div>

        {/* Online users sidebar (desktop) + drawer (mobile) */}
        <OnlineUsers
          users={onlineUsers}
          visible={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  );
}
