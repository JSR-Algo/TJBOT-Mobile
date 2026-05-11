import { create } from 'zustand';

// Auth state machine: addresses ISSUE 5 from user-flow-review.md (leaky auth).
// States:
//   anonymous   — no session
//   authenticating — login request in flight
//   authenticated — valid session
//   expiring    — token refresh in flight (stay-on-screen)
//   expired     — token expired, must re-auth before next protected call
//   revoked     — server-side invalidated; force-logout to onb_login
export const useAuthStore = create((set, get) => ({
  user: null,
  child: null,
  status: 'anonymous',
  token: null,

  beginLogin: () => set({ status: 'authenticating' }),

  loginSuccess: ({ user, token, child = null }) =>
    set({ user, token, child, status: 'authenticated' }),

  loginFailure: () => set({ status: 'anonymous', user: null, token: null }),

  beginRefresh: () => {
    if (get().status === 'authenticated') set({ status: 'expiring' });
  },

  refreshSuccess: ({ token }) => set({ token, status: 'authenticated' }),

  refreshFailure: () => set({ status: 'expired' }),

  // Server told us our session is invalid — force logout.
  revoke: () => set({ status: 'revoked', user: null, token: null, child: null }),

  // User-initiated logout — clear everything, go to onb_login.
  logout: () => set({ status: 'anonymous', user: null, token: null, child: null }),

  setChild: (child) => set({ child }),

  // Selector helpers
  isAuthenticated: () => get().status === 'authenticated' || get().status === 'expiring',
  needsReauth: () => ['expired', 'revoked'].includes(get().status),
}));
