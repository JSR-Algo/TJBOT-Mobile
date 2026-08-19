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

const active: ParentLearningStatus = { activeLearning: { assignmentId: 'a', sessionId: null, courseId: 'c', courseTitle: 'C', lessonId: 'l', lessonTitle: 'L', state: 'READY', startedAt: null, currentStep: { stepId: 'step-4', stepNumber: 4, total: 9, activityTitle: 'Original activity', phase: 'teaching', subject: 'barn' }, positionPercent: 0, activeDurationSec: 0 }, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '1' };
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
  closeFromServer(code: number, reason: string): void { this.onclose?.({ code, reason, wasClean: false }); }
  open(): void { this.onopen?.(); }
  message(frame: unknown): void { this.onmessage?.({ data: JSON.stringify(frame) }); }
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

  it('refreshes and reconnects after the realtime access token expires', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    const callsBeforeExpiry = mockStatus.mock.calls.length;

    act(() => sockets[0].closeFromServer(4401, 'expired auth'));

    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeExpiry + 1));
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(sockets).toHaveLength(2);
    const callsAfterReconnect = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(9_500); });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsAfterReconnect + 1));
    view.unmount();
  });

  it('merges a partial realtime update without losing active-learning identity', async () => {
    const view = setup();
    view.client.setQueryData(['lesson-progress', 'child', 'child-1'], [{ stale: true }]);
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;
    sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z',
      activeLearning: { lessonTitle: 'Updated lesson', state: 'RUNNING', positionPercent: 44, activeDurationSec: 210, currentStep: { stepNumber: 5, total: 9, activityTitle: 'Updated activity', phase: 'listening', subject: 'barn' } },
    });

    const immediate = view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'));
    expect(immediate?.projectionRevision).toBe('2');
    expect(immediate?.activeLearning).toMatchObject({
      assignmentId: 'a', courseId: 'c', lessonId: 'l', startedAt: null,
      lessonTitle: 'Updated lesson', state: 'RUNNING', positionPercent: 44, activeDurationSec: 210,
    });
    expect(immediate?.activeLearning?.currentStep).toMatchObject({ stepId: 'step-4', stepNumber: 5, activityTitle: 'Updated activity' });
    expect(view.client.getQueryState(['lesson-progress', 'child', 'child-1'])?.isInvalidated).toBe(true);
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));

    act(() => resolveRefresh({ ...active, activeLearning: immediate!.activeLearning, projectionRevision: '2' }));
    await waitFor(() => expect(view.result.current.data?.projectionRevision).toBe('2'));
    view.unmount();
  });

  it('keeps a newer realtime projection when an older HTTP refresh resolves later', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;

    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-08-19T00:00:00Z', publishedAt: '2026-08-19T00:00:01Z',
      activeLearning: {
        state: 'RUNNING', positionPercent: 44, activeDurationSec: 20,
        currentStep: { stepId: 'step-4', stepNumber: 4, total: 9, activityTitle: 'Name the feeling', phase: 'practice', subject: 'sad' },
      },
    }));

    await waitFor(() => expect(view.result.current.data?.projectionRevision).toBe('2'));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));
    act(() => resolveRefresh(active));

    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.data).toMatchObject({
      projectionRevision: '2',
      activeLearning: { positionPercent: 44, currentStep: { stepNumber: 4 } },
    });
    view.unmount();
  });

  it('creates the first current step immediately from a complete realtime update', async () => {
    const initial = { ...active, activeLearning: { ...active.activeLearning!, currentStep: null } };
    mockStatus.mockResolvedValue(initial);
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;
    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-08-17T00:00:00Z', publishedAt: '2026-08-17T00:00:01Z',
      activeLearning: {
        state: 'RUNNING', positionPercent: 11,
        currentStep: { stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Meet the feelings', phase: 'teaching', subject: null },
      },
    }));

    const immediate = view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'));
    expect(immediate?.projectionRevision).toBe('2');
    expect(immediate?.activeLearning?.positionPercent).toBe(11);
    expect(immediate?.activeLearning?.currentStep).toEqual({
      stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Meet the feelings', phase: 'teaching', subject: null,
    });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));

    act(() => resolveRefresh({ ...initial, activeLearning: immediate!.activeLearning, projectionRevision: '2' }));
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    view.unmount();
  });

  it('creates an active lesson when realtime starts after an initially inactive status', async () => {
    mockStatus.mockResolvedValue(inactive);
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));

    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '3',
      occurredAt: '2026-08-17T00:00:00Z', publishedAt: '2026-08-17T00:00:01Z',
      activeLearning: {
        assignmentId: 'assignment-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'Feelings',
        lessonId: 'lesson-1', lessonTitle: 'Meet the feelings', state: 'RUNNING', startedAt: '2026-08-17T00:00:00Z',
        positionPercent: 11, activeDurationSec: 1,
        currentStep: { stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Meet the feelings', phase: 'teaching', subject: null },
      },
    }));

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))).toMatchObject({
      projectionRevision: '3',
      activeLearning: {
        assignmentId: 'assignment-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'Feelings',
        lessonId: 'lesson-1', lessonTitle: 'Meet the feelings', state: 'RUNNING', startedAt: '2026-08-17T00:00:00Z',
        positionPercent: 11, activeDurationSec: 1,
        currentStep: { stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Meet the feelings', phase: 'teaching', subject: null },
      },
    });
    view.unmount();
  });

  it('keeps the first current step null for an incomplete realtime update', async () => {
    const initial = { ...active, activeLearning: { ...active.activeLearning!, currentStep: null } };
    mockStatus.mockResolvedValue(initial);
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;
    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-08-17T00:00:00Z', publishedAt: '2026-08-17T00:00:01Z',
      activeLearning: {
        state: 'RUNNING', positionPercent: 11,
        currentStep: { stepNumber: 1, total: 9, activityTitle: 'Meet the feelings', phase: 'teaching', subject: null },
      },
    }));

    const immediate = view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'));
    expect(immediate?.projectionRevision).toBe('2');
    expect(immediate?.activeLearning?.positionPercent).toBe(11);
    expect(immediate?.activeLearning?.currentStep).toBeNull();
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));

    act(() => resolveRefresh({ ...initial, projectionRevision: '2' }));
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    view.unmount();
  });

  it('clears terminal activity immediately while refreshing durable progress projections', async () => {
    const view = setup();
    view.client.setQueryData(['parent-learning-history', 'child-1'], { pages: [{ items: [], nextCursor: null }], pageParams: [null] });
    view.client.setQueryData(['lesson-progress', 'child', 'child-1'], [{ stale: true }]);
    view.client.setQueryData(['child-progress-dashboard', 'child', 'child-1'], { stale: true });
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;

    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z', activeLearning: { state: 'COMPLETED' },
    }));

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning).toBeNull();
    expect(view.client.getQueryData(['child-progress-dashboard', 'child', 'child-1'])).toBeUndefined();
    expect(view.client.getQueryState(['lesson-progress', 'child', 'child-1'])?.isInvalidated).toBe(true);
    expect(view.client.getQueryState(['parent-learning-history', 'child-1'])?.isInvalidated).toBe(true);
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));

    act(() => resolveRefresh({ ...inactive, projectionRevision: '2' }));
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    view.unmount();
  });

  it('falls back to polling when the initial realtime connection rejects', async () => {
    mockToken.mockResolvedValue(null);
    const view = setup();
    await waitFor(() => expect(mockStatus.mock.calls.length).toBeGreaterThanOrEqual(2));
    const afterFailureRefetch = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    await waitFor(() => expect(mockStatus.mock.calls.length).toBe(afterFailureRefetch + 1));
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
    await waitFor(() => expect(sockets[0].closed).toBe(true));
  });

  it('shares one realtime connection across two mounted consumers of the same child', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const view = renderHook(() => ({ first: useParentLearningStatusQuery('child-1'), second: useParentLearningStatusQuery('child-1') }), { wrapper });
    await waitFor(() => expect(view.result.current.first.data).toBeDefined());
    await waitFor(() => expect(sockets).toHaveLength(1));
    view.unmount();
    await waitFor(() => expect(sockets[0].closed).toBe(true));
  });
});
