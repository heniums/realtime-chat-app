interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) {
    // Reserve height so the layout doesn't shift when the indicator appears.
    return <div className="h-5" />;
  }

  let label: string;
  if (users.length === 1) {
    label = `${users[0]} is typing…`;
  } else if (users.length === 2) {
    label = `${users[0]} and ${users[1]} are typing…`;
  } else {
    label = `${users[0]}, ${users[1]}, and ${users.length - 2} others are typing…`;
  }

  return (
    <div className="h-5 px-4 text-xs text-gray-400 italic">{label}</div>
  );
}
