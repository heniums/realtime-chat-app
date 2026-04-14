import { useAuth } from '../context/AuthContext';

interface OnlineUsersProps {
  users: string[];
  visible: boolean;
  onClose: () => void;
}

export function OnlineUsers({ users, visible, onClose }: OnlineUsersProps) {
  const { username: currentUser } = useAuth();

  return (
    <>
      {/* Desktop: always-visible sidebar (md and up) */}
      <aside className="hidden md:flex w-48 border-l border-gray-200 flex-col">
        <SidebarContent users={users} currentUser={currentUser} />
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
                Online ({users.length})
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

function SidebarContent({ users, currentUser }: { users: string[]; currentUser: string | null }) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Online ({users.length})
        </h3>
      </div>
      <UserList users={users} currentUser={currentUser} />
    </>
  );
}

function UserList({ users, currentUser }: { users: string[]; currentUser: string | null }) {
  return (
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
  );
}
