import {
  compareProjectionRevisions,
  openParentProgressRealtime,
  type ParentProgressRealtimeCallbacks,
} from '@/services/ws/parentProgressRealtime';
import { setParentProgressDiagnosticsEnabledForTest } from '@/services/observability/parentProgressDiagnostics';
import type { RealtimeSocket } from '@/services/ws/realtime';

class FakeSocket implements RealtimeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean?: boolean }) => void) | null = null;
  sent: string[] = [];
  closed = false;
  send(data: string) { this.sent.push(data); }
  close() { this.closed = true; }
  message(frame: unknown) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  closeFromServer(code: number) { this.onclose?.({ code, reason: '', wasClean: false }); }
}

class ImmediateOpenSocket implements RealtimeSocket {
  private openHandler: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean?: boolean }) => void) | null = null;
  sent: string[] = [];

  get onopen(): (() => void) | null { return this.openHandler; }
  set onopen(handler: (() => void) | null) {
    this.openHandler = handler;
    handler?.();
  }

  send(data: string) { this.sent.push(data); }
  close() {}
}

const sockets: FakeSocket[] = [];
const createSocket = () => { const socket = new FakeSocket(); sockets.push(socket); return socket; };

describe('parent progress realtime', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);

  beforeEach(() => {
    sockets.length = 0;
    jest.useRealTimers();
    info.mockClear();
    setParentProgressDiagnosticsEnabledForTest(null);
  });

  afterAll(() => {
    info.mockRestore();
    setParentProgressDiagnosticsEnabledForTest(null);
  });

  it('compares canonical decimal revisions without Number coercion', () => {
    expect(compareProjectionRevisions('9007199254740993', '9007199254740992')).toBe(1);
    expect(compareProjectionRevisions('00012', '12')).toBe(0);
    expect(compareProjectionRevisions('12', '13')).toBe(-1);
  });

  it('rejects numeric projection revisions as invalid frames', async () => {
    const onInvalidate = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '9007199254740993', {
      onStatus: jest.fn(), onInvalidate, onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });

    sockets[0].message({ type: 'lesson.progress.updated', childId: 'child-1', projectionRevision: 9007199254740994 });

    expect(onInvalidate).toHaveBeenCalledTimes(1);
    connection.close();
  });

  it('keeps parent progress diagnostics silent unless explicitly enabled', async () => {
    const onUpdate = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '12', {
      onStatus: jest.fn(), onUpdate, onInvalidate: jest.fn(), onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });

    sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-secret', projectionRevision: '13',
      occurredAt: '2026-08-20T00:00:00Z', publishedAt: '2026-08-20T00:00:01Z',
      activeLearning: { state: 'RUNNING', positionPercent: 89, currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null } },
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    connection.close();
  });

  it('emits non-PII parent progress diagnostics for websocket receive, drop, and apply decisions', async () => {
    setParentProgressDiagnosticsEnabledForTest(true);
    const onUpdate = jest.fn();
    const onInvalidate = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '12', {
      onStatus: jest.fn(), onUpdate, onInvalidate, onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });

    sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-secret', projectionRevision: '13',
      occurredAt: '2026-08-20T00:00:00Z', publishedAt: '2026-08-20T00:00:01Z',
      activeLearning: { state: 'RUNNING', positionPercent: 89, currentStep: { stepId: 'step-8', stepNumber: 8, total: 9, activityTitle: 'Activity 8', phase: 'teaching', subject: null } },
    });
    sockets[0].message({ type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-secret', projectionRevision: '13' });
    sockets[0].message({ type: 'lesson.progress.nope', childId: 'child-1', projectionRevision: '14' });

    const events = info.mock.calls
      .filter(call => call[0] === 'parent_progress_diag')
      .map(call => call[1]);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'ws', decision: 'receive', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '13', state: 'RUNNING', stepId: 'step-8', stepNumber: 8, percent: 89 }),
      expect.objectContaining({ source: 'ws', decision: 'apply_update', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '13', state: 'RUNNING', stepId: 'step-8', stepNumber: 8, percent: 89 }),
      expect.objectContaining({ source: 'ws', decision: 'drop_stale', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '13' }),
      expect.objectContaining({ source: 'ws', decision: 'drop_unknown_type', childKey: expect.stringMatching(/^child_[a-z0-9]+$/), revision: '14' }),
    ]));
    expect(JSON.stringify(events)).not.toContain('child-1');
    expect(JSON.stringify(events)).not.toContain('session-secret');
    connection.close();
  });

  it('preserves a spec-shaped active-learning update as a partial delta', async () => {
    const onUpdate = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '12', {
      onStatus: jest.fn(), onUpdate, onInvalidate: jest.fn(), onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });

    sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '13',
      occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z',
      activeLearning: { lessonTitle: 'Updated title', state: 'RUNNING', positionPercent: 44, activeDurationSec: 210, deviceId: 'must-be-dropped' },
    });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      projectionRevision: '13',
      activeLearning: { lessonTitle: 'Updated title', state: 'RUNNING', positionPercent: 44, activeDurationSec: 210 },
    }));
    connection.close();
  });

  it('subscribes with the last revision, applies sequential frames, and refetches gaps or invalid frames', async () => {
    const callbacks: ParentProgressRealtimeCallbacks = { onStatus: jest.fn(), onInvalidate: jest.fn(), onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn() };
    const connection = await openParentProgressRealtime('child-1', '9007199254740993', callbacks, { baseUrl: 'https://api.test/v1', createSocket, tokenProvider: async () => 'parent-jwt', reconnect: false });
    sockets[0].onopen?.();
    expect(sockets[0].sent).toEqual(['{"type":"subscribe","childId":"child-1","lastProjectionRevision":"9007199254740993"}']);
    sockets[0].message({ type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '9007199254740994', status: { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '9007199254740994' } });
    sockets[0].message({ type: 'lesson.progress.updated', childId: 'child-1', sessionId: null, projectionRevision: '9007199254740994', occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z', activeLearning: null });
    sockets[0].message({ type: 'lesson.progress.updated', childId: 'child-1', sessionId: null, projectionRevision: '9007199254740996', occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z', activeLearning: { positionPercent: 99 } });
    sockets[0].message({ nope: true });
    expect(callbacks.onStatus).toHaveBeenCalledTimes(1);
    expect(callbacks.onInvalidate).toHaveBeenCalledTimes(2);
    connection.close();
  });

  it('accepts a complete active-learning projection after a revision gap', async () => {
    const onUpdate = jest.fn();
    const onInvalidate = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '12', {
      onStatus: jest.fn(), onUpdate, onInvalidate, onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });

    sockets[0].message({
      type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '14',
      occurredAt: '2026-08-17T00:00:00Z', publishedAt: '2026-08-17T00:00:01Z',
      activeLearning: {
        assignmentId: 'assignment-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'Feelings',
        lessonId: 'lesson-1', lessonTitle: 'Meet the feelings', state: 'RUNNING', startedAt: '2026-08-17T00:00:00Z',
        positionPercent: 44, activeDurationSec: 30,
        currentStep: { stepId: 'step-4', stepNumber: 4, total: 9, activityTitle: 'Name the feeling', phase: 'practice', subject: 'sad' },
      },
    });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ projectionRevision: '14' }));
    expect(onInvalidate).not.toHaveBeenCalled();
    connection.close();
  });

  it('subscribes when the native socket opens during handler attachment', async () => {
    const socket = new ImmediateOpenSocket();
    const connection = await openParentProgressRealtime('child-1', '41', {
      onStatus: jest.fn(), onInvalidate: jest.fn(), onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket: () => socket, tokenProvider: async () => 'parent-jwt', reconnect: false });

    expect(socket.sent).toEqual(['{"type":"subscribe","childId":"child-1","lastProjectionRevision":"41"}']);
    connection.close();
  });

  it('invalidates a newer snapshot whose status is missing', async () => {
    const onInvalidate = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '7', {
      onStatus: jest.fn(), onInvalidate, onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });

    sockets[0].message({ type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '8' });

    expect(onInvalidate).toHaveBeenCalledTimes(1);
    connection.close();
  });

  it('maps parent auth close codes and closes the prior child socket on switch', async () => {
    const first = await openParentProgressRealtime('child-1', '0', { onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onInvalidate: jest.fn(), onStatus: jest.fn(), onReconnectExhausted: jest.fn() }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    const expired = jest.fn();
    await openParentProgressRealtime('child-2', '0', { onAuthExpired: expired, onAccessRevoked: jest.fn(), onInvalidate: jest.fn(), onStatus: jest.fn(), onReconnectExhausted: jest.fn() }, { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    expect(sockets[0].closed).toBe(true);
    sockets[1].closeFromServer(4401);
    expect(expired).toHaveBeenCalledTimes(1);
    first.close();
  });

  it('maps 4403 to access revoked without reconnecting', async () => {
    jest.useFakeTimers();
    const revoked = jest.fn();
    const connection = await openParentProgressRealtime('child-1', '0', {
      onAuthExpired: jest.fn(), onAccessRevoked: revoked, onInvalidate: jest.fn(), onStatus: jest.fn(), onReconnectExhausted: jest.fn(),
    }, { createSocket, tokenProvider: async () => 'jwt', reconnect: { initialDelayMs: 5, maxAttempts: 3, maxDelayMs: 5 } });

    sockets[0].closeFromServer(4403);
    await jest.advanceTimersByTimeAsync(100);

    expect(revoked).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(1);
    connection.close();
  });
});
