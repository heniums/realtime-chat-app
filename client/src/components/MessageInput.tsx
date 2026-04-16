import { useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';

const MAX_LENGTH = 1000;
const WARN_THRESHOLD = 900;

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  error?: string | null;
}

export function MessageInput({ onSend, onTyping, onStopTyping, error }: MessageInputProps) {
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

  const charCount = text.length;
  const isOverWarn = charCount > WARN_THRESHOLD;
  const isAtLimit = charCount >= MAX_LENGTH;

  return (
    <div className="border-t border-gray-200 px-4 py-3 space-y-1">
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-32"
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="Type a message… (Enter to send)"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) onTyping();
            }}
            onKeyDown={handleKeyDown}
          />
          {charCount > 0 && (
            <span
              className={clsx('absolute bottom-1 right-2 text-[10px]', {
                'text-red-500 font-semibold': isAtLimit,
                'text-amber-500': !isAtLimit && isOverWarn,
                'text-gray-300': !isAtLimit && !isOverWarn,
              })}
            >
              {charCount}/{MAX_LENGTH}
            </span>
          )}
        </div>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
