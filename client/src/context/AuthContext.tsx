import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'chat_auth';

interface AuthState {
  token: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, username: null };
    const parsed = JSON.parse(raw);
    if (parsed.token && parsed.username) return parsed;
  } catch {
    /* corrupted data — start fresh */
  }
  return { token: null, username: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadAuth);

  function login(token: string, username: string) {
    const state = { token, username };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setAuth(state);
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuth({ token: null, username: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
