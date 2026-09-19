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

class AlreadyOpenSocket extends FakeSocket {
  readonly readyState = 1;
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

  const callbacksForBoundary = () => ({
    onStatus: jest.fn(), onUpdate: jest.fn(), onInvalidate: jest.fn(),
    onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(),
    onReconnectExhausted: jest.fn(), onHealthy: jest.fn(),
  });
  const update = (projectionRevision = '100', activeLearning: unknown = { positionPercent: 25 }) => ({
    type: 'lesson.progress.updated', childId: 'child-1', sessionId: null,
    projectionRevision, occurredAt: '2026-09-14T00:00:00Z',
    publishedAt: '2026-09-14T00:00:01Z', activeLearning,
  });
  const status = (projectionRevision: string) => ({
    activeLearning: null, recentSessions: { items: [], nextCursor: null },
    courseProgress: [], courseModeWords: [], projectionRevision,
  });

  const malformedUpdates = [
    ...['sessionId', 'occurredAt', 'publishedAt', 'activeLearning'].flatMap(field =>
      [undefined, 42, []].map(value => ({ label: `${field}=${String(value)}`, frame: { ...update(), [field]: value } }))),
    ...['assignmentId', 'courseId', 'courseTitle', 'lessonId', 'lessonTitle', 'state', 'sessionId', 'startedAt']
      .map(field => ({ label: `active.${field}`, frame: update('100', { [field]: 42 }) })),
    ...['positionPercent', 'activeDurationSec'].flatMap(field => [-1, '25', null].map(value =>
      ({ label: `active.${field}=${String(value)}`, frame: update('100', { [field]: value }) }))),
    ...[[], 'step', 12].map(value => ({ label: `currentStep=${String(value)}`, frame: update('100', { currentStep: value }) })),
    ...['stepId', 'activityTitle', 'phase', 'subject'].map(field =>
      ({ label: `step.${field}`, frame: update('100', { currentStep: { [field]: 42 } }) })),
    ...['stepNumber', 'total'].flatMap(field => [-1, '1', null].map(value =>
      ({ label: `step.${field}=${String(value)}`, frame: update('100', { currentStep: { [field]: value } }) }))),
  ];
  it.each(malformedUpdates)('rejects malformed $label without consuming its revision', async ({ frame }) => {
    const callbacks = callbacksForBoundary();
    const connection = await openParentProgressRealtime('child-1', '99', callbacks,
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    try {
      sockets[0].message(frame);
      expect(callbacks.onInvalidate).toHaveBeenCalledTimes(1);
      expect(callbacks.onUpdate).not.toHaveBeenCalled();
      sockets[0].message(update());
      expect(callbacks.onUpdate).toHaveBeenCalledTimes(1);
      expect(callbacks.onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ projectionRevision: '100' }));
    } finally { connection.close(); }
  });

  it.each(['{', 'null', '[]', '42'])('rejects raw frame %s and then applies valid data at the same revision', async data => {
    const callbacks = callbacksForBoundary();
    const connection = await openParentProgressRealtime('child-1', '99', callbacks,
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    try {
      sockets[0].onmessage?.({ data });
      expect(callbacks.onInvalidate).toHaveBeenCalledTimes(1);
      sockets[0].message(update());
      expect(callbacks.onUpdate).toHaveBeenCalledTimes(1);
    } finally { connection.close(); }
  });

  it('drops stale snapshots and rejects mismatched status revisions without advancing', async () => {
    const callbacks = callbacksForBoundary();
    const connection = await openParentProgressRealtime('child-1', '99', callbacks,
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    try {
      for (const revision of ['98', '99']) sockets[0].message({
        type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: revision, status: status(revision),
      });
      expect(callbacks.onStatus).not.toHaveBeenCalled();
      expect(callbacks.onInvalidate).not.toHaveBeenCalled();
      sockets[0].message({ type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '100', status: status('101') });
      expect(callbacks.onInvalidate).toHaveBeenCalledTimes(1);
      sockets[0].message({ type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '100', status: status('100') });
      expect(callbacks.onStatus).toHaveBeenCalledTimes(1);
      expect(callbacks.onStatus).toHaveBeenCalledWith(expect.objectContaining({ projectionRevision: '100' }));
      sockets[0].message(update('101'));
      expect(callbacks.onUpdate).toHaveBeenCalledTimes(1);
    } finally { connection.close(); }
  });

  it.each([null, {}, { subject: null }, { stepNumber: 0, total: 0 }])('preserves nullable and partial step fields %#', async currentStep => {
    const callbacks = callbacksForBoundary();
    const connection = await openParentProgressRealtime('child-1', '99', callbacks,
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    try {
      const activeLearning = { sessionId: null, startedAt: null, currentStep };
      sockets[0].message(update('100', activeLearning));
      expect(callbacks.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ activeLearning }));
      expect(callbacks.onInvalidate).not.toHaveBeenCalled();
    } finally { connection.close(); }
  });

  // Independent decimal vectors include carries above Number's precision limit.
  it.each([['9', '10'], ['99', '100'], ['00999', '1000'], ['99999999999999999999', '100000000000000000000']])(
    'applies a sequential partial update across %s -> %s', async (before, after) => {
      const callbacks = callbacksForBoundary();
      const connection = await openParentProgressRealtime('child-1', before, callbacks,
        { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
      try {
        sockets[0].message(update(after));
        sockets[0].message(update(after));
        expect(callbacks.onUpdate).toHaveBeenCalledTimes(1);
        expect(callbacks.onInvalidate).not.toHaveBeenCalled();
      } finally { connection.close(); }
    },
  );

  it('rejects an unsupported base URL before requesting credentials or creating a socket', async () => {
    const tokenProvider = jest.fn(async () => 'jwt');
    await expect(openParentProgressRealtime('child-1', '0', callbacksForBoundary(), {
      baseUrl: 'ftp://api.test/path', createSocket, tokenProvider, reconnect: false,
    })).rejects.toThrow('PARENT_PROGRESS_BASE_URL_UNSUPPORTED');
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(0);
  });

  it.each(['before', 'after'] as const)('disposes a deferred old child when it resolves %s the new child', async order => {
    let resolveOld: (token: string) => void = () => { throw new Error('old token not requested'); };
    let resolveNew: (token: string) => void = () => { throw new Error('new token not requested'); };
    const oldSocket = new FakeSocket();
    const newSocket = new FakeSocket();
    const oldCallbacks = callbacksForBoundary();
    const oldOpening = openParentProgressRealtime('old-child', '0', oldCallbacks, {
      createSocket: () => oldSocket, tokenProvider: () => new Promise(resolve => { resolveOld = resolve; }), reconnect: false,
    });
    const newOpening = openParentProgressRealtime('new-child', '0', callbacksForBoundary(), {
      createSocket: () => newSocket, tokenProvider: () => new Promise(resolve => { resolveNew = resolve; }), reconnect: false,
    });
    if (order === 'before') { resolveOld('jwt'); await oldOpening; resolveNew('jwt'); }
    else { resolveNew('jwt'); await newOpening; resolveOld('jwt'); }
    const [oldConnection, newConnection] = await Promise.all([oldOpening, newOpening]);
    try {
      expect(oldSocket.closed).toBe(true);
      expect(newSocket.closed).toBe(false);
      expect(oldCallbacks.onHealthy).not.toHaveBeenCalled();
      oldConnection.close();
      const third = await openParentProgressRealtime('third-child', '0', callbacksForBoundary(),
        { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
      try { expect(newSocket.closed).toBe(true); } finally { third.close(); }
    } finally { oldConnection.close(); newConnection.close(); }
  });

  it('does not subscribe or announce healthy for a stale socket already open at attachment', async () => {
    let resolveToken: (token: string) => void = () => { throw new Error('token not requested'); };
    const staleSocket = new AlreadyOpenSocket();
    const staleCallbacks = callbacksForBoundary();
    const opening = openParentProgressRealtime('child-A', '0', staleCallbacks, {
      createSocket: () => staleSocket, tokenProvider: () => new Promise(resolve => { resolveToken = resolve; }), reconnect: false,
    });
    const current = await openParentProgressRealtime('child-B', '0', callbacksForBoundary(),
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    resolveToken('jwt');
    const stale = await opening;
    try {
      expect(staleCallbacks.onHealthy).not.toHaveBeenCalled();
      expect(staleSocket.sent).toEqual([]);
      expect(staleSocket.closed).toBe(true);
    } finally { stale.close(); current.close(); }
  });

  it('does not revive the first pending A after selecting A, B, then A again', async () => {
    let resolveToken: (token: string) => void = () => { throw new Error('token not requested'); };
    const staleSocket = new FakeSocket();
    const opening = openParentProgressRealtime('child-A', '0', callbacksForBoundary(), {
      createSocket: () => staleSocket, tokenProvider: () => new Promise(resolve => { resolveToken = resolve; }), reconnect: false,
    });
    const middle = await openParentProgressRealtime('child-B', '0', callbacksForBoundary(),
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    const current = await openParentProgressRealtime('child-A', '0', callbacksForBoundary(),
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    resolveToken('jwt');
    const stale = await opening;
    try {
      expect(staleSocket.closed).toBe(true);
      expect(sockets[0].closed).toBe(true);
      expect(sockets[1].closed).toBe(false);
    } finally { stale.close(); middle.close(); current.close(); }
  });

  it('keeps same-child observers independent while an earlier open is pending', async () => {
    let resolveToken: (token: string) => void = () => { throw new Error('token not requested'); };
    const firstSocket = new FakeSocket();
    const firstCallbacks = callbacksForBoundary();
    const secondCallbacks = callbacksForBoundary();
    const opening = openParentProgressRealtime('child-1', '99', firstCallbacks, {
      createSocket: () => firstSocket, tokenProvider: () => new Promise(resolve => { resolveToken = resolve; }), reconnect: false,
    });
    const second = await openParentProgressRealtime('child-1', '99', secondCallbacks,
      { createSocket, tokenProvider: async () => 'jwt', reconnect: false });
    resolveToken('jwt');
    const first = await opening;
    try {
      expect(firstSocket.closed).toBe(false);
      expect(sockets[0].closed).toBe(false);
      firstSocket.message(update()); sockets[0].message(update());
      expect(firstCallbacks.onUpdate).toHaveBeenCalledTimes(1);
      expect(secondCallbacks.onUpdate).toHaveBeenCalledTimes(1);
      first.close();
      sockets[0].message(update('101'));
      expect(secondCallbacks.onUpdate).toHaveBeenCalledTimes(2);
    } finally { first.close(); second.close(); }
  });
});
