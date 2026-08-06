// T3.3 deep-dive — parent realtime during a live lesson.
//
// Boxes covered here:
//   * WS drop during live lesson: reconnect + refetch catch-up; no missed terminal event
//   * Duplicate realtime events render once (idempotent reducers)
//
// The transport is driven through the REAL socket stack (global WebSocket ->
// createReconnectingSocket -> openParentProgressRealtime -> the query hook) so the
// assertions are on the wire frames the parent app actually sends, not on a mocked
// abstraction over them.

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
let sockets: NativeSocket[];

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
  message(frame: unknown): void { this.onmessage?.({ data: JSON.stringify(frame) }); }
}

const running: ParentLearningStatus = {
  activeLearning: {
    assignmentId: 'assign-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'English',
    lessonId: 'lesson-1', lessonTitle: 'Farm animals', state: 'RUNNING', startedAt: '2026-08-06T01:00:00Z',
    currentStep: { stepId: 'step-3', stepNumber: 3, total: 9, activityTitle: 'Name the animal', phase: 'teaching', subject: 'barn' },
    positionPercent: 33, activeDurationSec: 120,
  },
  recentSessions: { items: [], nextCursor: null },
  courseProgress: [],
  projectionRevision: '41',
};

function subscribeFrames(socket: NativeSocket): Array<Record<string, unknown>> {
  return socket.sent.map(raw => JSON.parse(raw) as Record<string, unknown>).filter(frame => frame.type === 'subscribe');
}

function progressFrame(projectionRevision: string, activeLearning: Record<string, unknown> | null): Record<string, unknown> {
  return {
    type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision,
    occurredAt: '2026-08-06T01:02:00Z', publishedAt: '2026-08-06T01:02:01Z', activeLearning,
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useParentLearningStatusQuery('child-1'), { wrapper }) };
}

describe('T3.3 — parent realtime catch-up across a mid-lesson socket drop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sockets = [];
    (global as unknown as { WebSocket: typeof NativeSocket }).WebSocket = NativeSocket;
    (AppState as unknown as { currentState: string }).currentState = 'active';
    (AppState.addEventListener as jest.Mock).mockImplementation(() => ({ remove: jest.fn() }));
    mockToken.mockResolvedValue('parent-jwt');
    mockStatus.mockResolvedValue(running);
  });
  afterEach(() => jest.useRealTimers());

  it('re-subscribes from the last APPLIED revision after the socket drops mid-lesson', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => sockets[0].open());
    expect(subscribeFrames(sockets[0])).toEqual([{ type: 'subscribe', childId: 'child-1', lastProjectionRevision: '41' }]);

    act(() => sockets[0].message(progressFrame('42', { state: 'RUNNING', positionPercent: 55 })));
    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.projectionRevision).toBe('42');

    sockets[0].fail();
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(sockets).toHaveLength(2);
    act(() => sockets[1].open());

    // Catch-up depends on resubscribing at the revision the client already applied.
    // Replaying '41' would re-deliver an event the dashboard already rendered.
    expect(subscribeFrames(sockets[1])).toEqual([{ type: 'subscribe', childId: 'child-1', lastProjectionRevision: '42' }]);
    view.unmount();
  });

  it('recovers a terminal event that landed while the socket was down', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => sockets[0].open());
    await waitFor(() => expect(view.result.current.data?.activeLearning?.state).toBe('RUNNING'));

    // The lesson finishes during the outage: the terminal frame is never delivered.
    const terminal: ParentLearningStatus = {
      ...running,
      activeLearning: null,
      recentSessions: { items: [{ childId: 'child-1', assignmentId: 'assign-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'English', lessonId: 'lesson-1', lessonTitle: 'Farm animals', terminalState: 'COMPLETED', startedAt: '2026-08-06T01:00:00Z', completedAt: '2026-08-06T01:05:00Z', durationSec: 300, reportAvailable: true }], nextCursor: null },
      projectionRevision: '48',
    };
    mockStatus.mockResolvedValue(terminal);

    sockets[0].fail();
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });

    await waitFor(() => expect(view.result.current.data?.projectionRevision).toBe('48'));
    expect(view.result.current.data?.activeLearning).toBeNull();
    expect(view.result.current.data?.recentSessions.items).toHaveLength(1);
    view.unmount();
  });

  it('applies a duplicate or replayed realtime frame exactly once', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => sockets[0].open());

    act(() => sockets[0].message(progressFrame('42', { positionPercent: 55, activeDurationSec: 200 })));
    const applied = view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'));
    expect(applied?.activeLearning).toMatchObject({ positionPercent: 55, activeDurationSec: 200 });

    // Same revision redelivered (at-least-once transport) and an older revision replayed.
    act(() => sockets[0].message(progressFrame('42', { positionPercent: 99, activeDurationSec: 999 })));
    act(() => sockets[0].message(progressFrame('41', { positionPercent: 1, activeDurationSec: 1 })));

    const afterDuplicates = view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'));
    expect(afterDuplicates?.activeLearning).toMatchObject({ positionPercent: 55, activeDurationSec: 200 });
    expect(afterDuplicates?.projectionRevision).toBe('42');
    view.unmount();
  });

  it('refetches instead of guessing when the realtime stream skips a revision', async () => {
    const view = setup();
    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => sockets[0].open());
    const before = mockStatus.mock.calls.length;

    // 41 -> 43 is a gap: the delta for 42 was lost, so a partial merge would be wrong.
    act(() => sockets[0].message(progressFrame('43', { positionPercent: 77 })));

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning?.positionPercent).toBe(33);
    await waitFor(() => expect(mockStatus.mock.calls.length).toBe(before + 1));
    view.unmount();
  });
});
