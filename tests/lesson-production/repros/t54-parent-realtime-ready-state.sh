#!/usr/bin/env bash
# repo: tbot-mobile
set -euo pipefail

transport_probe="tests/_t54_parent_realtime_ready_state_transport.test.ts"
hook_probe="tests/_t54_parent_realtime_ready_state_hook.test.tsx"
cleanup() { rm -f "$transport_probe" "$hook_probe"; }
trap cleanup EXIT

cat >"$transport_probe" <<'TS'
import { createReconnectingSocket, type RealtimeSocket } from '@/services/ws/realtime';

class AlreadyOpenSocket implements RealtimeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { readonly data: string }) => void) | null = null;
  onerror: ((event: { readonly message?: string }) => void) | null = null;
  onclose: ((event: { readonly code: number; readonly reason: string; readonly wasClean?: boolean }) => void) | null = null;
  readonly readyState = 1;

  send(): void {}
  close(): void {}
}

describe('T5.4 parent realtime ready-state transport', () => {
  it('reports a native socket that opened before handlers attached exactly once', async () => {
    const socket = new AlreadyOpenSocket();
    const onOpen = jest.fn();
    const connection = await createReconnectingSocket('wss://api.test/parent-progress', {
      createSocket: () => socket,
      onOpen,
      reconnect: false,
      tokenProvider: async () => 'parent-jwt',
    });

    expect(onOpen).toHaveBeenCalledTimes(1);
    socket.onopen?.();
    expect(onOpen).toHaveBeenCalledTimes(1);
    connection.close();
  });
});
TS

cat >"$hook_probe" <<'TS'
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

const inactive: ParentLearningStatus = {
  activeLearning: null,
  recentSessions: { items: [], nextCursor: null },
  courseProgress: [],
  projectionRevision: '2',
};
const active: ParentLearningStatus = {
  ...inactive,
  activeLearning: {
    assignmentId: 'assignment-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'Feelings',
    lessonId: 'lesson-1', lessonTitle: 'Meet the feelings', state: 'RUNNING', startedAt: '2026-08-17T00:00:00Z',
    positionPercent: 11, activeDurationSec: 1, currentStep: null,
  },
};

class NativeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean?: boolean }) => void) | null = null;
  constructor(_url: string, _protocols: unknown, _options: unknown) { sockets.push(this); }
  send(): void {}
  close(): void {}
  closeFromServer(code: number, reason: string): void { this.onclose?.({ code, reason, wasClean: false }); }
  message(frame: unknown): void { this.onmessage?.({ data: JSON.stringify(frame) }); }
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useParentLearningStatusQuery('child-1'), { wrapper }) };
}

describe('T5.4 Parent Today realtime recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sockets = [];
    (global as unknown as { WebSocket: typeof NativeSocket }).WebSocket = NativeSocket;
    (AppState as unknown as { currentState: string }).currentState = 'active';
    mockToken.mockResolvedValue('parent-jwt');
    mockStatus.mockResolvedValue(inactive);
  });

  afterEach(() => jest.useRealTimers());

  it('creates the active lesson when the screen initially loaded no lesson', async () => {
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

    expect(view.client.getQueryData<ParentLearningStatus>(parentLearningStatusKey('child-1'))?.activeLearning)
      .toMatchObject({ assignmentId: 'assignment-1', state: 'RUNNING', positionPercent: 11 });
    view.unmount();
  });

  it('refetches immediately and reconnects after JWT close code 4401', async () => {
    mockStatus.mockResolvedValue(active);
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
});
TS

if [ ! -e node_modules ]; then
  ln -s ${TBOT_REPRO_DEPENDENCY_ROOT:-$TBOT_REPRO_REPO_ROOT}/node_modules node_modules
fi
node \
  node_modules/jest/bin/jest.js --selectProjects unit --runInBand "$transport_probe" "$hook_probe"
