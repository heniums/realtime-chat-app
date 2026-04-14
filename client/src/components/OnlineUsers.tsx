import { useAuth } from '../context/AuthContext';

interface OnlineUsersProps {
  users: string[];
}

export function OnlineUsers({ users }: OnlineUsersProps) {
  const { username: currentUser } = useAuth();

  return (
    <aside className="w-48 border-l border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Online ({users.length})
        </h3>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {users.map((user) => (
          <li
            key={user}
            className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className={user === currentUser ? 'font-semibold' : ''}>
              {user}
              {user === currentUser && (
                <span className="ml-1 text-xs text-gray-400">(you)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
