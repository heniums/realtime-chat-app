import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import Login from './pages/Login';
import Rooms from './pages/Rooms';
import Chat from './pages/Chat';

// SocketManager connects/disconnects the socket based on auth state.
// Placed inside AuthProvider so it can read the token.
function SocketManager() {
  useSocket();
  return null;
}

// Redirects unauthenticated users to the login page.
function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketManager />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/rooms"
            element={
              <RequireAuth>
                <Rooms />
              </RequireAuth>
            }
          />
          <Route
            path="/rooms/:id"
            element={
              <RequireAuth>
                <Chat />
              </RequireAuth>
            }
          />
          {/* Catch-all: redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
