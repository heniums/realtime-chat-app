import clsx from 'clsx';

interface Reaction {
  emoji: string;
  userIds: string[];
}

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
}

export function MessageReactions({ reactions, currentUserId, onToggle }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => {
        const isMine = r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(r.emoji)}
            className={clsx(
              'inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors',
              {
                'bg-indigo-50 border-indigo-300 text-indigo-700': isMine,
                'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100': !isMine,
              },
            )}
          >
            <span>{r.emoji}</span>
            <span>{r.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}
