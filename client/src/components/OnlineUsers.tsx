import { useAuth } from '../context/AuthContext';
import type { OnlineUser } from '../hooks/useRoom';
import { USER_STATUS } from '../socket/events';

interface OnlineUsersProps {
  users: OnlineUser[];
  visible: boolean;
  onClose: () => void;
}

export function OnlineUsers({ users, visible, onClose }: OnlineUsersProps) {
  const { username: currentUser } = useAuth();
  const onlineCount = users.filter((u) => u.status === USER_STATUS.ONLINE).length;

  return (
    <>
      {/* Desktop: always-visible sidebar (md and up) */}
      <aside className="hidden md:flex w-48 border-l border-gray-200 flex-col">
        <SidebarContent users={users} currentUser={currentUser} onlineCount={onlineCount} />
      </aside>

      {/* Mobile: slide-over drawer (below md) */}
      {visible && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="absolute right-0 top-0 bottom-0 w-56 bg-white shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Online ({onlineCount})
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-sm"
                aria-label="Close user list"
              >
                ✕
              </button>
            </div>
            <UserList users={users} currentUser={currentUser} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  users,
  currentUser,
  onlineCount,
}: {
  users: OnlineUser[];
  currentUser: string | null;
  onlineCount: number;
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Online ({onlineCount})
        </h3>
      </div>
      <UserList users={users} currentUser={currentUser} />
    </>
  );
}

function UserList({ users, currentUser }: { users: OnlineUser[]; currentUser: string | null }) {
  // Sort: online users first, then offline
  const sorted = [...users].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === USER_STATUS.ONLINE ? -1 : 1;
  });

  return (
    <ul className="flex-1 overflow-y-auto py-2">
      {sorted.map((user) => (
        <li
          key={user.username}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm ${
            user.status === USER_STATUS.OFFLINE ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              user.status === USER_STATUS.ONLINE ? 'bg-green-400' : 'bg-gray-300'
            }`}
          />
          <span className={user.username === currentUser ? 'font-semibold' : ''}>
            {user.username}
            {user.username === currentUser && (
              <span className="ml-1 text-xs text-gray-400">(you)</span>
            )}
            {user.status === USER_STATUS.OFFLINE && (
              <span className="ml-1 text-xs text-gray-400 italic">offline</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
