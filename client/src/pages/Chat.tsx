import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { useMessages } from '../hooks/useMessages';
import { useTyping } from '../hooks/useTyping';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { OnlineUsers } from '../components/OnlineUsers';
import { TypingIndicator } from '../components/TypingIndicator';

export default function Chat() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { username } = useAuth();

  const { onlineUsers } = useRoom(roomId);
  const { messages, sendMessage, bottomRef } = useMessages(roomId);
  const { typingUsers, notifyTyping, stopTyping } = useTyping(roomId);

  function handleSend(text: string) {
    sendMessage(text);
    stopTyping();
  }

  // Filter current user out of the typing indicator (server should already do
  // this, but guard client-side too).
  const othersTyping = typingUsers.filter((u) => u !== username);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/rooms')}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Back to rooms"
        >
          ←
        </button>
        <h1 className="text-sm font-semibold text-gray-900">
          Room: <span className="font-mono text-xs text-gray-500">{roomId}</span>
        </h1>
      </header>

      {/* Body: messages + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Message area */}
        <div className="flex flex-col flex-1 min-w-0">
          <MessageList messages={messages} bottomRef={bottomRef} />
          <TypingIndicator users={othersTyping} />
          <MessageInput
            onSend={handleSend}
            onTyping={notifyTyping}
            onStopTyping={stopTyping}
          />
        </div>

        {/* Online users sidebar */}
        <OnlineUsers users={onlineUsers} />
      </div>
    </div>
  );
}
