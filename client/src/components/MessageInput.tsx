import { useState, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export function MessageInput({ onSend, onTyping, onStopTyping }: MessageInputProps) {
  const [text, setText] = useState('');

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter (without Shift), new line on Shift+Enter.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onStopTyping();
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3 flex items-end gap-2">
      <textarea
        className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-32"
        rows={1}
        placeholder="Type a message… (Enter to send)"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value) onTyping();
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </div>
  );
}
