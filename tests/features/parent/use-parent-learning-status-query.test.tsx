import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parentLearningStatusKey, useParentLearningStatusQuery } from '@/features/parent/hooks/useParentLearningStatusQuery';
import { getParentLearningStatus, type ParentLearningStatus } from '@/services/api/parentLearning.api';
import { getAccessToken } from '@/services/http/tokens';
import { setParentProgressDiagnosticsEnabledForTest } from '@/services/observability/parentProgressDiagnostics';

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

function setup(childId = 'child-1', reconcileWhileActive = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {
    client,
    ...renderHook<ReturnType<typeof useParentLearningStatusQuery>, { id: string; reconcile?: boolean }>(
      ({ id, reconcile }) => useParentLearningStatusQuery(id, { reconcileWhileActive: reconcile }),
      { initialProps: { id: childId, reconcile: reconcileWhileActive }, wrapper },
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
  const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    info.mockClear();
    setParentProgressDiagnosticsEnabledForTest(null);
    sockets = [];
    appStateChange = undefined;
    (global as unknown as { WebSocket: typeof NativeSocket }).WebSocket = NativeSocket;
    (AppState as unknown as { currentState: string }).currentState = 'active';
    (AppState.addEventListener as jest.Mock).mockImplementation((_event: string, listener: (state: string) => void) => { appStateChange = listener; return { remove: jest.fn() }; });
    mockToken.mockResolvedValue('parent-jwt');
    mockStatus.mockResolvedValue(active);
  });
  afterEach(() => {
    jest.useRealTimers();
    setParentProgressDiagnosticsEnabledForTest(null);
  });
  afterAll(() => info.mockRestore());

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

  it('reconciles and surfaces a newly created assignment when opened with inactive status and healthy-silent socket', async () => {
    mockStatus.mockResolvedValueOnce({ ...inactive, projectionRevision: '0' });
    const view = setup('child-1', true);
    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => sockets[0].open());
    await waitFor(() => expect(view.result.current.data?.activeLearning).toBeNull());
    const afterInitial = mockStatus.mock.calls.length;

    mockStatus.mockResolvedValueOnce(active);
    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(afterInitial + 1));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.assignmentId).toBe('a'));
    view.unmount();
  });

  it('reconciles an active Parent Today assignment while the socket remains healthy', async () => {
    const view = setup('child-1', true);
    await waitFor(() => expect(sockets).toHaveLength(1));
    const afterInitialLoad = mockStatus.mock.calls.length;

    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });

    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(afterInitialLoad + 1));
    view.rerender({ id: 'child-1', reconcile: false });
    const afterBlur = mockStatus.mock.calls.length;
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    expect(mockStatus).toHaveBeenCalledTimes(afterBlur);
    view.unmount();
  });

  it('does not starve a slow active reconciliation on the next focused poll tick', async () => {
    const ready = {
      ...active,
      activeLearning: { ...active.activeLearning!, currentStep: null, positionPercent: 0 },
      projectionRevision: '1',
    };
    const stepOne = {
      ...ready,
      activeLearning: {
        ...ready.activeLearning!,
        state: 'RUNNING', positionPercent: 11,
        currentStep: { stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Activity 1', phase: 'teaching', subject: null },
      },
      projectionRevision: '2',
    };
    let resolveSlowReconciliation!: (status: ParentLearningStatus) => void;
    mockStatus
      .mockResolvedValueOnce(ready)
      .mockImplementationOnce(() => new Promise(resolve => { resolveSlowReconciliation = resolve; }))
      .mockImplementation(() => new Promise(() => undefined));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.state).toBe('READY'));

    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });
    expect(mockStatus).toHaveBeenCalledTimes(2);
    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });

    act(() => resolveSlowReconciliation(stepOne));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(1));
    expect(mockStatus).toHaveBeenCalledTimes(3);
    view.unmount();
  });

  it('samples every second while earlier focused projections are still pending', async () => {
    const ready = {
      ...inactive,
      projectionRevision: '1',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(ready)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning).toBeNull());

    await act(async () => { await jest.advanceTimersByTimeAsync(4_000); });
    expect(pending).toHaveLength(4);

    const observedSteps: number[] = [];
    for (let index = 0; index < pending.length; index += 1) {
      const stepNumber = index + 1;
      act(() => pending[index]({
        ...ready,
        activeLearning: {
          ...active.activeLearning!,
          state: 'RUNNING', positionPercent: Math.round((stepNumber / 9) * 100),
          currentStep: { stepId: `step-${stepNumber}`, stepNumber, total: 9, activityTitle: `Activity ${stepNumber}`, phase: 'teaching', subject: null },
        },
        projectionRevision: String(stepNumber + 1),
      }));
      await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(stepNumber));
      observedSteps.push(view.result.current.data!.activeLearning!.currentStep!.stepNumber);
    }

    expect(observedSteps).toEqual([1, 2, 3, 4]);
    view.unmount();
  });

  it('drains authoritative s8 and s9 samples before applying a partial terminal frame', async () => {
    const stepSeven = {
      ...active,
      activeLearning: {
        ...active.activeLearning!, state: 'RUNNING', positionPercent: 78,
        currentStep: { stepId: 'step-7', stepNumber: 7, total: 9, activityTitle: 'Activity 7', phase: 'practice', subject: null },
      },
      projectionRevision: '7',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(stepSeven)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '10',
      occurredAt: '2026-08-20T00:00:10Z', publishedAt: '2026-08-20T00:00:11Z', activeLearning: null,
    }));

    expect(pending).toHaveLength(3);
    expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7);

    act(() => pending[2]({ ...inactive, projectionRevision: '10' }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    act(() => pending[0]({
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, positionPercent: 89,
        currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null },
      },
      projectionRevision: '8',
    }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(8));

    await act(async () => {
      pending[1]({
        ...stepSeven,
        activeLearning: {
          ...stepSeven.activeLearning!, positionPercent: 100,
          currentStep: { stepId: 'step-9', stepNumber: 9, total: 9, activityTitle: 'Activity 9', phase: 'teaching', subject: null },
        },
        projectionRevision: '9',
      });
      await Promise.resolve();
    });
    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning?.currentStep?.stepNumber).toBe(9);

    expect(pending).toHaveLength(3);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(view.result.current.data?.activeLearning).toBeNull());
    view.unmount();
  });

  it('defers an inactive focused sample until pending s8 and s9 samples drain', async () => {
    const stepSeven = {
      ...active,
      activeLearning: {
        ...active.activeLearning!, state: 'RUNNING', positionPercent: 78,
        currentStep: { stepId: 'step-7', stepNumber: 7, total: 9, activityTitle: 'Activity 7', phase: 'practice', subject: null },
      },
      projectionRevision: '7',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(stepSeven)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
    expect(pending).toHaveLength(3);

    act(() => pending[2]({ ...inactive, projectionRevision: '10' }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    act(() => pending[0]({
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, positionPercent: 89,
        currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null },
      },
      projectionRevision: '8',
    }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(8));

    await act(async () => {
      pending[1]({
        ...stepSeven,
        activeLearning: {
          ...stepSeven.activeLearning!, positionPercent: 100,
          currentStep: { stepId: 'step-9', stepNumber: 9, total: 9, activityTitle: 'Activity 9', phase: 'teaching', subject: null },
        },
        projectionRevision: '9',
      });
      await Promise.resolve();
    });
    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning?.currentStep?.stepNumber).toBe(9);

    expect(pending).toHaveLength(3);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(view.result.current.data?.activeLearning).toBeNull());
    view.unmount();
  });

  it('emits non-PII diagnostics for focused sample apply, defer, cache, and drop decisions', async () => {
    setParentProgressDiagnosticsEnabledForTest(true);
    const stepSeven = {
      ...active,
      activeLearning: {
        ...active.activeLearning!, assignmentId: 'assignment-secret', sessionId: 'session-secret', state: 'RUNNING', positionPercent: 78,
        currentStep: { stepId: 'step-7', stepNumber: 7, total: 9, activityTitle: 'Activity 7', phase: 'practice', subject: null },
      },
      projectionRevision: '7',
    };
    const backendReadyWithoutStep = {
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, state: 'READY', currentStep: null, positionPercent: 0,
      },
      projectionRevision: '10',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(stepSeven)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
    expect(pending).toHaveLength(3);

    act(() => pending[2](backendReadyWithoutStep));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    act(() => pending[0]({
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, positionPercent: 89,
        currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null },
      },
      projectionRevision: '8',
    }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(8));

    await act(async () => {
      pending[1]({
        ...stepSeven,
        activeLearning: {
          ...stepSeven.activeLearning!, positionPercent: 100,
          currentStep: { stepId: 'step-9', stepNumber: 9, total: 9, activityTitle: 'Activity 9', phase: 'teaching', subject: null },
        },
        projectionRevision: '9',
      });
      await Promise.resolve();
    });
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(view.result.current.data).toMatchObject({
      projectionRevision: '10',
      activeLearning: { state: 'READY', currentStep: null, positionPercent: 0 },
    }));

    mockStatus.mockResolvedValueOnce({
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, positionPercent: 89,
        currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null },
      },
      projectionRevision: '8',
    });
    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(5));

    const events = info.mock.calls
      .filter(call => call[0] === 'parent_progress_diag')
      .map(call => call[1]);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'focused_http', decision: 'sample_start', childKey: expect.stringMatching(/^child_[a-z0-9]+$/) }),
      expect.objectContaining({ source: 'focused_http', decision: 'receive_sample', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '10', state: 'READY', stepId: null, stepNumber: null, percent: 0, terminalReady: true }),
      expect.objectContaining({ source: 'focused_http', decision: 'defer_terminal', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '10', terminalReady: true }),
      expect.objectContaining({ source: 'focused_http', decision: 'apply_sample', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '8', state: 'RUNNING', stepId: 'step-8', stepNumber: 8, percent: 89 }),
      expect.objectContaining({ source: 'focused_http', decision: 'apply_sample', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '9', state: 'RUNNING', stepId: 'step-9', stepNumber: 9, percent: 100 }),
      expect.objectContaining({ source: 'focused_http', decision: 'cache_deferred_terminal', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '10', terminalReady: true }),
      expect.objectContaining({ source: 'focused_http', decision: 'apply_deferred_terminal', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '10', terminalReady: true }),
      expect.objectContaining({ source: 'focused_http', decision: 'drop_stale_cache', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '8', cacheRevision: expect.any(String) }),
    ]));
    expect(JSON.stringify(events)).not.toContain('child-1');
    expect(JSON.stringify(events)).not.toContain('assignment-secret');
    expect(JSON.stringify(events)).not.toContain('session-secret');
    view.unmount();
  });

  it('applies the deferred inactive focused sample without requiring a second terminal fetch', async () => {
    const stepSeven = {
      ...active,
      activeLearning: {
        ...active.activeLearning!, state: 'RUNNING', positionPercent: 78,
        currentStep: { stepId: 'step-7', stepNumber: 7, total: 9, activityTitle: 'Activity 7', phase: 'practice', subject: null },
      },
      projectionRevision: '7',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(stepSeven)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
    expect(pending).toHaveLength(3);

    act(() => pending[2]({ ...inactive, projectionRevision: '10' }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    act(() => pending[0]({
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, positionPercent: 89,
        currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null },
      },
      projectionRevision: '8',
    }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(8));

    await act(async () => {
      pending[1]({
        ...stepSeven,
        activeLearning: {
          ...stepSeven.activeLearning!, positionPercent: 100,
          currentStep: { stepId: 'step-9', stepNumber: 9, total: 9, activityTitle: 'Activity 9', phase: 'teaching', subject: null },
        },
        projectionRevision: '9',
      });
      await Promise.resolve();
    });

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning?.currentStep?.stepNumber).toBe(9);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(view.result.current.data?.activeLearning).toBeNull());
    expect(pending).toHaveLength(3);
    expect(mockStatus).toHaveBeenCalledTimes(4);
    view.unmount();
  });

  it('defers an incomplete higher-revision focused projection until pending final steps drain', async () => {
    const stepSeven = {
      ...active,
      activeLearning: {
        ...active.activeLearning!, state: 'RUNNING', positionPercent: 78,
        currentStep: { stepId: 'step-7', stepNumber: 7, total: 9, activityTitle: 'Activity 7', phase: 'practice', subject: null },
      },
      projectionRevision: '7',
    };
    const backendReadyWithoutStep = {
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, state: 'READY', currentStep: null, positionPercent: 0,
      },
      projectionRevision: '10',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(stepSeven)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
    expect(pending).toHaveLength(3);

    act(() => pending[2](backendReadyWithoutStep));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(7));

    act(() => pending[0]({
      ...stepSeven,
      activeLearning: {
        ...stepSeven.activeLearning!, positionPercent: 89,
        currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null },
      },
      projectionRevision: '8',
    }));
    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(8));

    await act(async () => {
      pending[1]({
        ...stepSeven,
        activeLearning: {
          ...stepSeven.activeLearning!, positionPercent: 100,
          currentStep: { stepId: 'step-9', stepNumber: 9, total: 9, activityTitle: 'Activity 9', phase: 'teaching', subject: null },
        },
        projectionRevision: '9',
      });
      await Promise.resolve();
    });
    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning?.currentStep?.stepNumber).toBe(9);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(view.result.current.data).toMatchObject({
      projectionRevision: '10',
      activeLearning: { state: 'READY', currentStep: null, positionPercent: 0 },
    }));
    view.unmount();
  });

  it('accepts a new lesson identity while old focused samples are pending', async () => {
    const oldStepSeven = {
      ...active,
      activeLearning: {
        ...active.activeLearning!, assignmentId: 'assignment-old', sessionId: 'session-old', lessonId: 'lesson-old',
        state: 'RUNNING', positionPercent: 78,
        currentStep: { stepId: 'step-7', stepNumber: 7, total: 9, activityTitle: 'Activity 7', phase: 'practice', subject: null },
      },
      projectionRevision: '7',
    };
    const newLessonReady = {
      ...oldStepSeven,
      activeLearning: {
        ...oldStepSeven.activeLearning!, assignmentId: 'assignment-new', sessionId: 'session-new', lessonId: 'lesson-new',
        state: 'READY', currentStep: null, positionPercent: 0,
      },
      projectionRevision: '10',
    };
    const pending: Array<(status: ParentLearningStatus) => void> = [];
    mockStatus
      .mockResolvedValueOnce(oldStepSeven)
      .mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = setup('child-1', true);
    await waitFor(() => expect(view.result.current.data?.activeLearning?.assignmentId).toBe('assignment-old'));

    await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
    expect(pending).toHaveLength(3);

    act(() => pending[2](newLessonReady));
    await waitFor(() => expect(view.result.current.data).toMatchObject({
      projectionRevision: '10',
      activeLearning: { assignmentId: 'assignment-new', sessionId: 'session-new', lessonId: 'lesson-new', state: 'READY', currentStep: null },
    }));
    view.unmount();
  });

  it('does not starve inactive-cache discovery across consecutive partial realtime frames', async () => {
    let resolveDiscovery!: (status: ParentLearningStatus) => void;
    mockStatus
      .mockResolvedValueOnce({ ...inactive, projectionRevision: '1' })
      .mockImplementationOnce(() => new Promise(resolve => { resolveDiscovery = resolve; }))
      .mockImplementation(() => new Promise(() => undefined));
    const view = setup('child-1', true);
    await waitFor(() => expect(sockets).toHaveLength(1));

    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-08-20T00:00:00Z', publishedAt: '2026-08-20T00:00:01Z',
      activeLearning: { state: 'READY', currentStep: null, positionPercent: 0 },
    }));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(2));
    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '3',
      occurredAt: '2026-08-20T00:00:01Z', publishedAt: '2026-08-20T00:00:02Z',
      activeLearning: {
        state: 'RUNNING', positionPercent: 11,
        currentStep: { stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Activity 1', phase: 'teaching', subject: null },
      },
    }));

    act(() => resolveDiscovery({
      ...active,
      activeLearning: {
        ...active.activeLearning!,
        state: 'RUNNING', positionPercent: 11,
        currentStep: { stepId: 'step-1', stepNumber: 1, total: 9, activityTitle: 'Activity 1', phase: 'teaching', subject: null },
      },
      projectionRevision: '3',
    }));

    await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(1));
    expect(mockStatus).toHaveBeenCalledTimes(3);
    view.unmount();
  });

  it('reconciles every short step transition while Parent Today is focused and realtime is silent', async () => {
    mockStatus.mockResolvedValueOnce({
      ...active,
      activeLearning: { ...active.activeLearning!, currentStep: null, positionPercent: 0 },
      projectionRevision: '0',
    });
    const view = setup('child-1', true);
    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => sockets[0].open());

    const observedSteps: number[] = [];
    for (let stepNumber = 1; stepNumber <= 9; stepNumber += 1) {
      mockStatus.mockResolvedValueOnce({
        ...active,
        activeLearning: {
          ...active.activeLearning!,
          state: 'RUNNING',
          currentStep: {
            stepId: `step-${stepNumber}`,
            stepNumber,
            total: 9,
            activityTitle: `Activity ${stepNumber}`,
            phase: 'teaching',
            subject: null,
          },
          positionPercent: Math.round((stepNumber / 9) * 100),
        },
        projectionRevision: String(stepNumber),
      });

      await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });
      await waitFor(() => expect(view.result.current.data?.activeLearning?.currentStep?.stepNumber).toBe(stepNumber));
      observedSteps.push(view.result.current.data!.activeLearning!.currentStep!.stepNumber);
    }

    expect(observedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    view.unmount();
  });

  it('does not regress when an older HTTP projection resolves after a newer realtime step', async () => {
    const view = setup('child-1', true);
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;
    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '6',
      occurredAt: '2026-08-20T00:00:00Z', publishedAt: '2026-08-20T00:00:01Z',
      activeLearning: {
        ...active.activeLearning,
        state: 'RUNNING', positionPercent: 67, activeDurationSec: 60,
        currentStep: { stepId: 'step-6', stepNumber: 6, total: 9, activityTitle: 'Activity 6', phase: 'practice', subject: null },
      },
    }));

    await waitFor(() => expect(view.result.current.data).toMatchObject({
      projectionRevision: '6',
      activeLearning: { positionPercent: 67, currentStep: { stepNumber: 6 } },
    }));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));

    act(() => resolveRefresh({
      ...active,
      activeLearning: {
        ...active.activeLearning!,
        state: 'RUNNING', positionPercent: 44,
        currentStep: { stepId: 'step-4', stepNumber: 4, total: 9, activityTitle: 'Activity 4', phase: 'practice', subject: null },
      },
      projectionRevision: '4',
    }));

    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.data).toMatchObject({
      projectionRevision: '6',
      activeLearning: { positionPercent: 67, currentStep: { stepNumber: 6 } },
    });
    view.unmount();
  });

  it('does not resurrect active learning when an older HTTP projection resolves after completion', async () => {
    const view = setup('child-1', true);
    await waitFor(() => expect(sockets).toHaveLength(1));

    let resolveRefresh!: (status: ParentLearningStatus) => void;
    mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
    const callsBeforeUpdate = mockStatus.mock.calls.length;
    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '10',
      occurredAt: '2026-08-20T00:00:10Z', publishedAt: '2026-08-20T00:00:11Z', activeLearning: null,
    }));

    await waitFor(() => expect(view.result.current.data).toMatchObject({
      projectionRevision: '10', activeLearning: null,
    }));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));

    act(() => resolveRefresh({
      ...active,
      activeLearning: {
        ...active.activeLearning!,
        state: 'RUNNING', positionPercent: 100,
        currentStep: { stepId: 'step-9', stepNumber: 9, total: 9, activityTitle: 'Activity 9', phase: 'practice', subject: null },
      },
      projectionRevision: '9',
    }));

    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.data).toMatchObject({ projectionRevision: '10', activeLearning: null });
    view.unmount();
  });

  it('does not let an older realtime frame overwrite a newer HTTP projection', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    view.client.setQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'), {
      ...active,
      activeLearning: {
        ...active.activeLearning!,
        state: 'RUNNING', positionPercent: 67,
        currentStep: { stepId: 'step-6', stepNumber: 6, total: 9, activityTitle: 'Activity 6', phase: 'practice', subject: null },
      },
      projectionRevision: '6',
    });

    act(() => sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
      occurredAt: '2026-08-20T00:00:00Z', publishedAt: '2026-08-20T00:00:01Z',
      activeLearning: {
        ...active.activeLearning,
        state: 'RUNNING', positionPercent: 22, activeDurationSec: 20,
        currentStep: { stepId: 'step-2', stepNumber: 2, total: 9, activityTitle: 'Activity 2', phase: 'practice', subject: null },
      },
    }));

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))).toMatchObject({
      projectionRevision: '6',
      activeLearning: { positionPercent: 67, currentStep: { stepNumber: 6 } },
    });
    view.unmount();
  });

  it('does not let an older realtime snapshot overwrite a newer HTTP projection', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    view.client.setQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'), {
      ...active,
      activeLearning: {
        ...active.activeLearning!,
        state: 'RUNNING', positionPercent: 67,
        currentStep: { stepId: 'step-6', stepNumber: 6, total: 9, activityTitle: 'Activity 6', phase: 'practice', subject: null },
      },
      projectionRevision: '6',
    });

    act(() => sockets[0].message({
      type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '2',
      status: {
        ...active,
        activeLearning: {
          ...active.activeLearning!,
          state: 'RUNNING', positionPercent: 22,
          currentStep: { stepId: 'step-2', stepNumber: 2, total: 9, activityTitle: 'Activity 2', phase: 'practice', subject: null },
        },
        projectionRevision: '2',
      },
    }));

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))).toMatchObject({
      projectionRevision: '6',
      activeLearning: { positionPercent: 67, currentStep: { stepNumber: 6 } },
    });
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
