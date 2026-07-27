import {
  compareProjectionRevisions,
  openParentProgressRealtime,
  type ParentProgressRealtimeCallbacks,
} from '@/services/ws/parentProgressRealtime';
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

const sockets: FakeSocket[] = [];
const createSocket = () => { const socket = new FakeSocket(); sockets.push(socket); return socket; };

describe('parent progress realtime', () => {
  beforeEach(() => { sockets.length = 0; jest.useRealTimers(); });

  it('compares canonical decimal revisions without Number coercion', () => {
    expect(compareProjectionRevisions('9007199254740993', '9007199254740992')).toBe(1);
    expect(compareProjectionRevisions('00012', '12')).toBe(0);
    expect(compareProjectionRevisions('12', '13')).toBe(-1);
  });

  it('subscribes with the last revision, applies sequential frames, and refetches gaps or invalid frames', async () => {
    const callbacks: ParentProgressRealtimeCallbacks = { onStatus: jest.fn(), onInvalidate: jest.fn(), onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn() };
    const connection = await openParentProgressRealtime('child-1', '9007199254740993', callbacks, { baseUrl: 'https://api.test/v1', createSocket, tokenProvider: async () => 'parent-jwt', reconnect: false });
    sockets[0].onopen?.();
    expect(sockets[0].sent).toEqual(['{"type":"subscribe","childId":"child-1","lastProjectionRevision":"9007199254740993"}']);
    sockets[0].message({ type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '9007199254740994', status: { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '9007199254740994' } });
    sockets[0].message({ type: 'lesson.progress.updated', childId: 'child-1', sessionId: null, projectionRevision: '9007199254740994', occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z', activeLearning: null });
    sockets[0].message({ type: 'lesson.progress.updated', childId: 'child-1', sessionId: null, projectionRevision: '9007199254740996', occurredAt: '2026-07-27T00:00:00Z', publishedAt: '2026-07-27T00:00:01Z', activeLearning: null });
    sockets[0].message({ nope: true });
    expect(callbacks.onStatus).toHaveBeenCalledTimes(1);
    expect(callbacks.onInvalidate).toHaveBeenCalledTimes(2);
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
