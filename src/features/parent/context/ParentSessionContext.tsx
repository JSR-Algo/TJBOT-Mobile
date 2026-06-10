import React from 'react';

// Parent-gate session policy (sys-07 / parent/flow.md:17-18):
//   - Absolute lifetime:    30 minutes after successful PIN entry
//   - Idle lifetime:         5 minutes since last parent-side activity
//
// Whichever boundary trips first invalidates the gate; the next access to
// any protected parent screen must re-prompt for the PIN.
//
// This context is the SOURCE OF TRUTH for the freshness decision.
// Mounting: at app root, alongside other long-lived contexts.
export const PARENT_GATE_ABSOLUTE_MS = 30 * 60 * 1000;
export const PARENT_GATE_IDLE_MS = 5 * 60 * 1000;

interface ParentSessionState {
  /** ms-epoch when the parent last entered the PIN successfully. */
  readonly gatedAt: number | null;
  /** ms-epoch of the parent's last activity inside a parent surface. */
  readonly lastActivityAt: number | null;
}

interface ParentSessionContextValue extends ParentSessionState {
  /** Returns true iff a fresh parent session exists at the time of the call. */
  isFresh(): boolean;
  /** Called when a PIN entry succeeds — opens the absolute + idle window. */
  markGated(): void;
  /** Called on any parent-side activity — extends the idle window only. */
  touchActivity(): void;
  /** Force-invalidate the gate (logout, role change, idle-timer expiry, etc.). */
  clearGate(): void;
}

const ParentSessionContext = React.createContext<ParentSessionContextValue | null>(null);

function computeIsFresh(gatedAt: number | null, lastActivityAt: number | null): boolean {
  if (gatedAt === null) return false;
  const now = Date.now();
  if (now - gatedAt > PARENT_GATE_ABSOLUTE_MS) return false;
  const touched = lastActivityAt ?? gatedAt;
  if (now - touched > PARENT_GATE_IDLE_MS) return false;
  return true;
}

export function ParentSessionProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [gatedAt, setGatedAt] = React.useState<number | null>(null);
  const [lastActivityAt, setLastActivityAt] = React.useState<number | null>(null);

  const markGated = React.useCallback((): void => {
    const now = Date.now();
    setGatedAt(now);
    setLastActivityAt(now);
  }, []);

  const touchActivity = React.useCallback((): void => {
    setLastActivityAt(Date.now());
  }, []);

  const clearGate = React.useCallback((): void => {
    setGatedAt(null);
    setLastActivityAt(null);
  }, []);

  // Note: no AppState handler. `isFresh()` reads `Date.now()` at call time,
  // so a stale window is detected by the next consumer call even after a
  // long background pause — no extra cleanup pass needed. The previous
  // attempt to also pre-emptively clear state on foreground via nested
  // setState updaters had a known race where the inner setter's reducer
  // ran AFTER the outer setter captured `isStillFresh`, mismatching the
  // two state values. Keeping the predicate as the single authority is
  // simpler and avoids that class of bug.

  const value = React.useMemo<ParentSessionContextValue>(
    () => ({
      gatedAt,
      lastActivityAt,
      isFresh: () => computeIsFresh(gatedAt, lastActivityAt),
      markGated,
      touchActivity,
      clearGate,
    }),
    [gatedAt, lastActivityAt, markGated, touchActivity, clearGate],
  );

  return <ParentSessionContext.Provider value={value}>{children}</ParentSessionContext.Provider>;
}

export function useParentSession(): ParentSessionContextValue {
  const ctx = React.useContext(ParentSessionContext);
  if (ctx === null) {
    throw new Error('useParentSession must be used within a ParentSessionProvider');
  }
  return ctx;
}
