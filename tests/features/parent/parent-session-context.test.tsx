// Lock in the freshness invariants of ParentSessionContext (Batch 7):
//   - markGated opens the 30-min absolute + 5-min idle window
//   - touchActivity extends the idle window only
//   - the absolute window cannot be extended
//   - clearGate force-invalidates the session
//   - isFresh() reads wall-clock time, so long background pauses naturally
//     return false on the next call without any explicit cleanup pass
//
// These are security-relevant — the spec (parent/flow.md:17-18) hangs off
// these numbers, and a regression would silently let a parent session
// outlive its window.

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  ParentSessionProvider,
  useParentSession,
  PARENT_GATE_ABSOLUTE_MS,
  PARENT_GATE_IDLE_MS,
} from '../../../src/features/parent/context/ParentSessionContext';

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <ParentSessionProvider>{children}</ParentSessionProvider>
);

describe('ParentSessionContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-19T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts stale', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    expect(result.current.isFresh()).toBe(false);
  });

  it('becomes fresh after markGated', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });
    expect(result.current.isFresh()).toBe(true);
  });

  it('goes stale after the 30-min absolute window', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });

    // Push time past the absolute window. We also touchActivity inside the
    // window so the idle timer is NOT what's invalidating us — proving the
    // absolute timer fires independently.
    act(() => {
      jest.advanceTimersByTime(PARENT_GATE_ABSOLUTE_MS - 1000);
      result.current.touchActivity();
      jest.advanceTimersByTime(2000); // crosses absolute boundary
    });

    expect(result.current.isFresh()).toBe(false);
  });

  it('goes stale after the 5-min idle window even when absolute is fine', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });
    act(() => { jest.advanceTimersByTime(PARENT_GATE_IDLE_MS + 1000); });
    expect(result.current.isFresh()).toBe(false);
  });

  it('touchActivity extends the idle window', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });

    // Just inside the idle window — touch — then advance again. Total
    // elapsed > 5 min, but the last touch resets the idle clock so we
    // should still be fresh.
    act(() => {
      jest.advanceTimersByTime(PARENT_GATE_IDLE_MS - 1000);
      result.current.touchActivity();
      jest.advanceTimersByTime(PARENT_GATE_IDLE_MS - 1000);
    });

    expect(result.current.isFresh()).toBe(true);
  });

  it('clearGate invalidates immediately', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });
    expect(result.current.isFresh()).toBe(true);
    act(() => { result.current.clearGate(); });
    expect(result.current.isFresh()).toBe(false);
  });

  it('wall-clock check catches a long background pause without explicit cleanup', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });

    // Simulate the user backgrounding the app and sitting through the idle
    // window. No explicit foreground handler runs; the next isFresh() call
    // still correctly reports stale because the predicate reads Date.now().
    act(() => { jest.advanceTimersByTime(PARENT_GATE_IDLE_MS + 1000); });
    expect(result.current.isFresh()).toBe(false);
  });

  it('a still-fresh gate after a short pause stays fresh', () => {
    const { result } = renderHook(() => useParentSession(), { wrapper });
    act(() => { result.current.markGated(); });
    act(() => { jest.advanceTimersByTime(60_000); }); // 1 min — well within both windows
    expect(result.current.isFresh()).toBe(true);
  });
});
