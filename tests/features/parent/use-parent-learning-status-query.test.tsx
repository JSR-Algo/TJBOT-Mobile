import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parentLearningStatusKey, useParentLearningStatusQuery } from '@/features/parent/hooks/useParentLearningStatusQuery';
import { getParentLearningStatus, type ParentLearningStatus } from '@/services/api/parentLearning.api';
import { getAccessToken } from '@/services/http/tokens';

jest.mock('@/services/api/parentLearning.api', () => ({
  ...jest.requireActual('@/services/api/parentLearning.api'),
  getParentLearningStatus: jest.fn(),
}));
jest.mock('@/services/http/tokens', () => ({ getAccessToken: jest.fn() }));

const mockStatus = getParentLearningStatus as jest.MockedFunction<typeof getParentLearningStatus>;
const mockToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
let appStateChange: ((state: string) => void) | undefined;
let sockets: NativeSocket[];

const active: ParentLearningStatus = { activeLearning: { assignmentId: 'a', sessionId: null, deviceId: 'd', courseId: 'c', courseTitle: 'C', lessonId: 'l', lessonTitle: 'L', state: 'READY', startedAt: null, currentStep: null, positionPercent: 0, activeDurationSec: 0 }, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '1' };
const terminal: ParentLearningStatus = { ...active, activeLearning: { ...active.activeLearning!, state: 'COMPLETED' }, projectionRevision: '2' };
const inactive: ParentLearningStatus = { ...active, activeLearning: null, projectionRevision: '2' };

class NativeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean?: boolean }) => void) | null = null;
  sent: string[] = [];
  closed = false;
  constructor(readonly url: string, _protocols: unknown, readonly options: { headers: { Authorization: string } }) { sockets.push(this); }
  send(data: string): void { this.sent.push(data); }
  close(): void { this.closed = true; }
  fail(): void { this.onclose?.({ code: 1006, reason: 'lost', wasClean: false }); }
  open(): void { this.onopen?.(); }
}

function setup(childId = 'child-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {
    client,
    ...renderHook<ReturnType<typeof useParentLearningStatusQuery>, { id: string }>(
      ({ id }) => useParentLearningStatusQuery(id),
      { initialProps: { id: childId }, wrapper },
    ),
  };
}

async function exhaustReconnects(): Promise<void> {
  sockets[0].fail();
  await act(async () => { await jest.advanceTimersByTimeAsync(500); });
  sockets[1].fail();
  await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });
  sockets[2].fail();
  await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });
  await act(async () => { sockets[3].fail(); await Promise.resolve(); });
}

describe('useParentLearningStatusQuery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sockets = [];
    appStateChange = undefined;
    (global as unknown as { WebSocket: typeof NativeSocket }).WebSocket = NativeSocket;
    (AppState as unknown as { currentState: string }).currentState = 'active';
    (AppState.addEventListener as jest.Mock).mockImplementation((_event: string, listener: (state: string) => void) => { appStateChange = listener; return { remove: jest.fn() }; });
    mockToken.mockResolvedValue('parent-jwt');
    mockStatus.mockResolvedValue(active);
  });
  afterEach(() => jest.useRealTimers());

  it('uses the canonical key and fetches immediately on mount', async () => {
    expect(parentLearningStatusKey('child-1')).toEqual(['parent-learning-status', 'child-1']);
    const view = setup();
    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith('child-1'));
    view.unmount();
  });

  it('refetches on foreground resume', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    const before = mockStatus.mock.calls.length;
    act(() => appStateChange?.('background'));
    act(() => appStateChange?.('active'));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(before + 1));
    view.unmount();
  });

  it('refetches after a real socket reconnect', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    const before = mockStatus.mock.calls.length;
    sockets[0].fail();
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(sockets).toHaveLength(2);
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(before + 1));
    view.unmount();
  });

  it('starts a 10 second poll only after three failed reconnects', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    await exhaustReconnects();
    const afterExhaustion = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(7_999); });
    expect(mockStatus).toHaveBeenCalledTimes(afterExhaustion);
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(afterExhaustion + 1));
    const afterReconnectRefetch = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(1_999); });
    expect(mockStatus).toHaveBeenCalledTimes(afterReconnectRefetch);
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(afterReconnectRefetch + 1));
    view.unmount();
  });

  it('suspends fallback polling when the socket recovers after exhaustion', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    await exhaustReconnects();
    await act(async () => { await jest.advanceTimersByTimeAsync(8_000); });
    expect(sockets).toHaveLength(5);
    act(() => sockets[4].open());
    const afterRecoveryRefetch = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    expect(mockStatus).toHaveBeenCalledTimes(afterRecoveryRefetch);
    view.unmount();
  });

  it.each([terminal, inactive])('stops fallback polling for terminal or inactive status', async (stoppedStatus) => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    await exhaustReconnects();
    mockStatus.mockResolvedValueOnce(stoppedStatus);
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    await waitFor(() => expect(view.result.current.data?.projectionRevision).toBe('2'));
    const afterStopped = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    expect(mockStatus).toHaveBeenCalledTimes(afterStopped);
    view.unmount();
  });

  it('stops fallback polling while the app is backgrounded', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    await exhaustReconnects();
    const afterExhaustion = mockStatus.mock.calls.length;
    act(() => appStateChange?.('background'));
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    // The transport still performs its required reconnect refetch at 8s,
    // but the 10s fallback poll remains suspended in the background.
    expect(mockStatus).toHaveBeenCalledTimes(afterExhaustion + 1);
    view.unmount();
  });

  it('closes the prior socket when the child changes', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    view.rerender({ id: 'child-2' });
    await waitFor(() => expect(sockets).toHaveLength(2));
    expect(sockets[0].closed).toBe(true);
    expect(mockStatus).toHaveBeenCalledWith('child-2');
    view.unmount();
  });

  it('closes the socket on unmount', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    view.unmount();
    expect(sockets[0].closed).toBe(true);
  });
});
