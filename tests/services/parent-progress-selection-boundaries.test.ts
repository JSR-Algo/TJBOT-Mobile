import { openParentProgressRealtime } from '@/services/ws/parentProgressRealtime';
import type { RealtimeSocket, RealtimeSocketCloseEvent, RealtimeSocketErrorEvent, RealtimeSocketMessageEvent } from '@/services/ws/realtime';

// RN 0.83 WebSocket.close enters CLOSING; native event subscriptions remain
// until websocketClosed. This adapter rejects event delivery after that point.
class NativeCloseSocket implements RealtimeSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: RealtimeSocketMessageEvent) => void) | null = null;
  onclose: ((event: RealtimeSocketCloseEvent) => void) | null = null;
  onerror: ((event: RealtimeSocketErrorEvent) => void) | null = null;
  sent: string[] = [];
  closeRequests: { code?: number; reason?: string }[] = [];
  send(data: string) { if (this.readyState !== 1) throw new Error('socket not open'); this.sent.push(data); }
  close(code?: number, reason?: string) {
    if (this.readyState >= 2) return;
    this.closeRequests.push({ code, reason }); this.readyState = 2;
  }
  open() { if (this.readyState !== 0) throw new Error('invalid open'); this.readyState = 1; this.onopen?.(); }
  queuedMessage(frame: object) {
    if (this.readyState !== 1 && this.readyState !== 2) throw new Error('native listeners absent');
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  finishClose(code: number) {
    if (this.readyState === 3) throw new Error('duplicate close');
    this.readyState = 3; this.onclose?.({ code, reason: 'native close notification' });
    this.onopen = this.onmessage = this.onclose = this.onerror = null;
  }
}
const callbacks = () => ({
  onStatus: jest.fn(), onUpdate: jest.fn(), onInvalidate: jest.fn(), onAuthExpired: jest.fn(),
  onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn(), onHealthy: jest.fn(), onReconnect: jest.fn(),
});
const snapshot = (childId: string, revision: string) => ({
  type: 'lesson.progress.snapshot', childId, projectionRevision: revision,
  status: { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [], courseModeWords: [], projectionRevision: revision },
});
const update = (childId: string, revision: string) => ({
  type: 'lesson.progress.updated', childId, sessionId: null, projectionRevision: revision,
  occurredAt: '2026-09-14T00:00:00Z', publishedAt: '2026-09-14T00:00:01Z', activeLearning: null,
});
const reconnect = { initialDelayMs: 5, maxDelayMs: 10, maxAttempts: 2 };
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('retains update 10 when snapshot 9 arrives late on the same open child socket', async () => {
  const socket = new NativeCloseSocket();
  const events = callbacks();
  const createSocket = jest.fn(() => socket);
  const connection = await openParentProgressRealtime('child-a', '8', events, {
    createSocket, tokenProvider: async () => 'test-token', reconnect,
  });
  try {
    socket.open();
    expect(socket.sent.map(value => JSON.parse(value))).toEqual([
      { type: 'subscribe', childId: 'child-a', lastProjectionRevision: '8' },
    ]);
    socket.queuedMessage(update('child-a', '10'));
    expect(events.onUpdate.mock.calls).toEqual([[update('child-a', '10')]]);
    const callsAfterUpdate = Object.values(events).map(callback => [...callback.mock.calls]);

    // The gateway awaits subscribe snapshots outside its broker delivery queue.
    socket.queuedMessage(snapshot('child-a', '9'));
    expect(Object.values(events).map(callback => callback.mock.calls)).toEqual(callsAfterUpdate);
    // A duplicate remains stale only if the delayed snapshot did not roll back revision 10.
    socket.queuedMessage(update('child-a', '10'));
    expect(Object.values(events).map(callback => callback.mock.calls)).toEqual(callsAfterUpdate);

    socket.queuedMessage(update('child-a', '11'));
    expect(events.onUpdate.mock.calls).toEqual([[update('child-a', '10')], [update('child-a', '11')]]);
    expect(events.onStatus).not.toHaveBeenCalled();
    expect(events.onInvalidate).not.toHaveBeenCalled();
    expect(events.onHealthy).toHaveBeenCalledTimes(1);
    expect(socket.readyState).toBe(1);
    expect(socket.closeRequests).toEqual([]);
    expect(createSocket).toHaveBeenCalledTimes(1);
  } finally { connection.close(); socket.finishClose(1000); }
  expect(jest.getTimerCount()).toBe(0);
});

it.each([4401, 4403])('fences queued old-child frames and native close %i while the next child awaits credentials', async code => {
  const oldSocket = new NativeCloseSocket(); const nextSocket = new NativeCloseSocket();
  const oldEvents = callbacks(); const nextEvents = callbacks();
  const oldFactory = jest.fn(() => oldSocket); const nextFactory = jest.fn(() => nextSocket);
  const old = await openParentProgressRealtime('child-a', '99', oldEvents, {
    baseUrl: 'http://localhost:3000/v1', createSocket: oldFactory, tokenProvider: async () => 'test-token', reconnect,
  });
  oldSocket.open(); oldSocket.queuedMessage(snapshot('child-a', '100'));
  expect(oldEvents.onStatus).toHaveBeenCalledTimes(1);
  let release!: (token: string) => void;
  const opening = openParentProgressRealtime('child-b', '0', nextEvents, {
    createSocket: nextFactory, tokenProvider: () => new Promise(resolve => { release = resolve; }), reconnect,
  });
  try {
    expect(old.url).toBe('ws://localhost:3000/parent-progress');
    expect(oldSocket.readyState).toBe(2);
    expect(oldSocket.closeRequests).toEqual([{ code: 1000, reason: 'child switched' }]);
    expect(nextFactory).not.toHaveBeenCalled();
    oldSocket.queuedMessage(snapshot('child-a', '101')); oldSocket.queuedMessage(update('child-a', '102'));
    oldSocket.finishClose(code);
    await jest.advanceTimersByTimeAsync(100);
    expect(oldEvents.onStatus).toHaveBeenCalledTimes(1); expect(oldEvents.onUpdate).not.toHaveBeenCalled();
    expect(oldEvents.onInvalidate).not.toHaveBeenCalled(); expect(oldEvents.onAuthExpired).not.toHaveBeenCalled();
    expect(oldEvents.onAccessRevoked).not.toHaveBeenCalled(); expect(oldEvents.onReconnect).not.toHaveBeenCalled();
    expect(oldEvents.onReconnectExhausted).not.toHaveBeenCalled(); expect(oldFactory).toHaveBeenCalledTimes(1);
  } finally { release('test-token'); }
  const next = await opening;
  try {
    nextSocket.open();
    expect(nextSocket.sent.map(value => JSON.parse(value))).toEqual([{ type: 'subscribe', childId: 'child-b', lastProjectionRevision: '0' }]);
    nextSocket.queuedMessage(snapshot('child-b', '1')); nextSocket.queuedMessage(update('child-b', '2'));
    expect(nextEvents.onStatus).toHaveBeenCalledWith(expect.objectContaining({ projectionRevision: '1' }));
    expect(nextEvents.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ childId: 'child-b', projectionRevision: '2' }));
    expect(nextEvents.onHealthy).toHaveBeenCalledTimes(1);
  } finally { old.close(); next.close(); nextSocket.finishClose(1000); }
  expect(jest.getTimerCount()).toBe(0);
});

it('A to B to A keeps the first A closing callbacks fenced while the new A accepts its own revision', async () => {
  const sockets = [new NativeCloseSocket(), new NativeCloseSocket(), new NativeCloseSocket()];
  const events = [callbacks(), callbacks(), callbacks()];
  const connections = [];
  for (const [index, childId] of ['child-a', 'child-b', 'child-a'].entries()) {
    connections.push(await openParentProgressRealtime(childId, '0', events[index], { createSocket: () => sockets[index], tokenProvider: async () => 'test-token', reconnect }));
    sockets[index].open();
  }
  try {
    expect(sockets.map(socket => socket.readyState)).toEqual([2, 2, 1]);
    sockets[0].queuedMessage(snapshot('child-a', '999')); sockets[0].finishClose(4403);
    sockets[1].queuedMessage(update('child-b', '100')); sockets[1].finishClose(4401);
    sockets[2].queuedMessage(snapshot('child-a', '1'));
    expect(events[0].onStatus).not.toHaveBeenCalled(); expect(events[0].onAccessRevoked).not.toHaveBeenCalled();
    expect(events[1].onUpdate).not.toHaveBeenCalled(); expect(events[1].onAuthExpired).not.toHaveBeenCalled();
    expect(events[2].onStatus).toHaveBeenCalledWith(expect.objectContaining({ projectionRevision: '1' }));
    await jest.advanceTimersByTimeAsync(100);
    expect(events.flatMap(event => event.onReconnect.mock.calls)).toEqual([]);
  } finally { connections.forEach(connection => connection.close()); sockets[2].finishClose(1000); }
  expect(jest.getTimerCount()).toBe(0);
});
