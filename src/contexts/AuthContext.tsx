import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User } from '../types';
import * as authApi from '../api/auth';
import * as accountApi from '../api/account';
import { setAuthInvalidatedHandler } from '../api/client';
import {
  clearTokens,
  deleteSecureItem,
  getAccessToken,
  getSecureJson,
  SECURE_STORE_KEYS,
  setSecureJson,
} from '../api/tokens';
import { normalizeError } from '../utils/errors';
import { identifyAnalyticsUser, resetAnalytics, trackEvent } from '../observability/analytics';

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

  // Force the UI back to the unauthenticated state. Used both when the user
  // explicitly logs out and when the axios interceptor detects that the
  // stored refresh token is no longer accepted by the backend.
  const forceLogout = useCallback(async () => {
    try {
      await clearTokens();
    } catch {
      // non-blocking
    }
    try {
      await deleteSecureItem(SECURE_STORE_KEYS.user);
    } catch {
      // non-blocking
    }
    resetAnalytics();
    setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
  }, []);

  // Register the force-logout handler with the axios client so the refresh
  // interceptor can invalidate the session from outside React state.
  const forceLogoutRef = useRef(forceLogout);
  forceLogoutRef.current = forceLogout;
  useEffect(() => {
    setAuthInvalidatedHandler(() => {
      void forceLogoutRef.current();
    });
    return () => setAuthInvalidatedHandler(null);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Fallback: if SecureStore hangs for >3s, unblock loading
      setState((s) => s.isLoading ? { ...s, isLoading: false } : s);
    }, 5000);

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          clearTimeout(timeout);
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        // Try to fetch the user profile to validate the stored token.
        // Only force-logout on a definitive auth rejection (the axios
        // interceptor returns a normalised error with `status === 401`).
        // On network errors, timeouts, or other transient failures, keep
        // the session alive using cached user data — benefit of the doubt.
        let user: User | null = null;
        let authRejected = false;
        try {
          user = await accountApi.getAccountSummary();
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status;
          authRejected = status === 401;
          user = null;
        }

        if (authRejected) {
          clearTimeout(timeout);
          await forceLogoutRef.current();
          return;
        }

        // Token is valid (or we can't tell due to network). Use fetched
        // user or fall back to cached SecureStore data.
        if (!user) {
          try {
            user = await getSecureJson<User>(SECURE_STORE_KEYS.user);
          } catch {
            user = null;
          }
        } else {
          try {
            await setSecureJson(SECURE_STORE_KEYS.user, user);
          } catch {
            // non-blocking
          }
        }

        clearTimeout(timeout);
        setState((s) => ({ ...s, user, isAuthenticated: true, isLoading: false }));
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
      // The staging backend's POST /v1/auth/login response does not currently
      // include a `user` object. Fall back to fetching the authenticated
      // account so the Profile screen and header avatar always have real data
      // instead of the `?`/`—` placeholder fallback.
      let user: User | null = data.user ?? null;
      if (!user) {
        try {
          user = await accountApi.getAccountSummary();
        } catch {
          user = null;
        }
      }
      if (user) {
        try {
          await setSecureJson(SECURE_STORE_KEYS.user, user);
        } catch {
          // non-blocking
        }
        identifyAnalyticsUser(user.id, user.email);
      }
      trackEvent('mobile.login.success');
      setState((s) => ({ ...s, user, isAuthenticated: true, error: null }));
    } catch (err) {
      const normalized = normalizeError(err);
      setState((s) => ({ ...s, error: normalized.message }));
      throw err;
    }
  };

  const logout = async () => {
    // Sign-out must always clear local state, even if the backend call fails
    // or the device is offline. A failed server-side session revoke must never
    // leave the UI stuck on an authenticated screen.
    try {
      await authApi.logout();
    } catch {
      // swallow — local cleanup still runs below
    }
    await forceLogout();
  };

  const signup = async (name: string, email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const data = await authApi.signup(name, email, password);
      // Signup now stores the access_token (see api/auth.ts). Fetch the
      // user profile and mark as authenticated so the user can proceed
      // through onboarding without a separate login step.
      if (data.access_token) {
        let user: User | null = null;
        try {
          user = await accountApi.getAccountSummary();
        } catch {
          user = { id: '', email, name };
        }
        if (user) {
          try {
            await setSecureJson(SECURE_STORE_KEYS.user, user);
          } catch {
            // non-blocking
          }
          identifyAnalyticsUser(user.id, user.email);
        }
        trackEvent('mobile.signup.success');
        setState((s) => ({ ...s, user, isAuthenticated: true, error: null }));
      }
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
