import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import * as authApi from '../api/auth';
import { getAccessToken, clearTokens } from '../api/tokens';
import { normalizeError } from '../utils/errors';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Fallback: if SecureStore hangs for >3s, unblock loading
      setState((s) => s.isLoading ? { ...s, isLoading: false } : s);
    }, 3000);

    (async () => {
      try {
        const token = await getAccessToken();
        clearTimeout(timeout);
        if (token) {
          // Restore cached user from secure storage if available
          let user: User | null = null;
          try {
            const { getItemAsync } = await import('expo-secure-store');
            const stored = await getItemAsync('tbot_user');
            if (stored) user = JSON.parse(stored) as User;
          } catch { /* ignore — user will be null, non-blocking */ }
          setState((s) => ({ ...s, user, isAuthenticated: true, isLoading: false }));
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        clearTimeout(timeout);
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();

    return () => clearTimeout(timeout);
  }, []);

  const login = async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const data = await authApi.login(email, password);
      const user = data.user ?? null;
      // Persist user for restore on app restart
      if (user) {
        try {
          const { setItemAsync } = await import('expo-secure-store');
          await setItemAsync('tbot_user', JSON.stringify(user));
        } catch { /* non-blocking */ }
      }
      setState((s) => ({ ...s, user, isAuthenticated: true, error: null }));
    } catch (err) {
      const normalized = normalizeError(err);
      setState((s) => ({ ...s, error: normalized.message }));
      throw err;
    }
  };

  const logout = async () => {
    await authApi.logout();
    // authApi.logout already clears tokens; no double-clear needed
    try {
      const { deleteItemAsync } = await import('expo-secure-store');
      await deleteItemAsync('tbot_user');
    } catch { /* non-blocking */ }
    setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
  };

  const signup = async (name: string, email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      await authApi.signup(name, email, password);
    } catch (err) {
      const normalized = normalizeError(err);
      setState((s) => ({ ...s, error: normalized.message }));
      throw err;
    }
  };

  const clearError = () => setState((s) => ({ ...s, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, login, logout, signup, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
