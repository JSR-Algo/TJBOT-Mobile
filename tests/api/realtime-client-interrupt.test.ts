/**
 * RM-05 — RealtimeClient.sendInterrupt() emits the canonical INTERRUPT envelope.
 *
 * The wire shape is locked by `tbot-infra/contracts/realtime-events.{d.ts,js}`
 * (Wave 1, ADR-006). Backend worker-1 (RB-01..06) consumes this exact shape to
 * thread the AbortSignal across STT/LLM/TTS. This test guards against silent
 * field renames or shape regressions on the mobile side.
 */
import { RealtimeClient } from '../../src/api/realtime.client';

interface FakeWebSocket {
  send: jest.Mock<void, [string]>;
  close: jest.Mock<void, [number?, string?]>;
  onopen: ((this: WebSocket, ev: Event) => unknown) | null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null;
  onerror: ((this: WebSocket, ev: Event) => unknown) | null;
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null;
  readyState: number;
}

function installFakeWebSocket(): { sockets: FakeWebSocket[]; restore: () => void } {
  const original = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
  const sockets: FakeWebSocket[] = [];

  class FakeWS implements FakeWebSocket {
    send = jest.fn<void, [string]>();
    close = jest.fn<void, [number?, string?]>();
    onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
    onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
    onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
    readyState = 1; // OPEN

    constructor(_url: string | URL) {
      sockets.push(this);
      // Mimic WebSocket: schedule onopen async so .connect() returns first.
      queueMicrotask(() => {
        this.readyState = 1;
        this.onopen?.call(this as unknown as WebSocket, new Event('open'));
      });
    }
  }

  // Mirror the static OPEN constant the RealtimeClient checks against.
  (FakeWS as unknown as { OPEN: number }).OPEN = 1;

  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    FakeWS as unknown as typeof WebSocket;

  return {
    sockets,
    restore: () => {
      if (original) {
        (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = original;
      } else {
        delete (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
      }
    },
  };
}

describe('RealtimeClient.sendInterrupt — RM-05 wire envelope', () => {
  let env: ReturnType<typeof installFakeWebSocket>;

  beforeEach(() => {
    env = installFakeWebSocket();
  });

  afterEach(() => {
    env.restore();
  });

  async function connectClient(): Promise<{ client: RealtimeClient; sock: FakeWebSocket }> {
    const client = new RealtimeClient({ url: 'ws://test.local/realtime', authToken: 'tkn' });
    client.connect();
    // Yield so the FakeWS microtask can fire onopen.
    await Promise.resolve();
    await Promise.resolve();
    const sock = env.sockets[env.sockets.length - 1];
    return { client, sock };
  }

  it('sends an INTERRUPT envelope matching the realtime-events.d.ts contract', async () => {
    const { client, sock } = await connectClient();
    sock.send.mockClear();

    client.sendInterrupt({ sessionId: 'sess-42', reason: 'USER_TAP' });

    expect(sock.send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(sock.send.mock.calls[0][0]);
    expect(payload.type).toBe('INTERRUPT');
    expect(payload.session_id).toBe('sess-42');
    expect(payload.payload).toEqual({ reason: 'USER_TAP', source: 'mobile' });
    expect(typeof payload.timestamp_ms).toBe('number');
  });

  it('defaults reason to USER_TAP and source to mobile', async () => {
    const { client, sock } = await connectClient();
    sock.send.mockClear();

    client.sendInterrupt();

    const payload = JSON.parse(sock.send.mock.calls[0][0]);
    expect(payload.payload.reason).toBe('USER_TAP');
    expect(payload.payload.source).toBe('mobile');
  });

  it('forwards turn_id when supplied', async () => {
    const { client, sock } = await connectClient();
    sock.send.mockClear();

    client.sendInterrupt({ sessionId: 's', turnId: 'turn-7', reason: 'USER_TAP' });

    const payload = JSON.parse(sock.send.mock.calls[0][0]);
    expect(payload.turn_id).toBe('turn-7');
  });

  it('omits turn_id when not supplied (no undefined leak in the wire payload)', async () => {
    const { client, sock } = await connectClient();
    sock.send.mockClear();

    client.sendInterrupt({ sessionId: 's' });

    const payload = JSON.parse(sock.send.mock.calls[0][0]);
    expect('turn_id' in payload).toBe(false);
  });

  it('buffers the INTERRUPT for resend if the socket is not OPEN (no silent drop)', () => {
    const client = new RealtimeClient({ url: 'ws://test.local/realtime' });
    // NOTE: connect() not called → no socket exists at all.
    client.sendInterrupt({ sessionId: 's', reason: 'USER_TAP' });
    // The internal reconnect buffer should hold the message until a socket exists.
    // We can verify by triggering a (fake) connect and watching the next send.
    client.connect();
    return Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => {
        const sock = env.sockets[env.sockets.length - 1];
        // First flushed call should be the buffered INTERRUPT.
        const flushed = sock.send.mock.calls.map((c) => JSON.parse(c[0] as string));
        const interrupts = flushed.filter((m: { type?: string }) => m.type === 'INTERRUPT');
        expect(interrupts.length).toBeGreaterThanOrEqual(1);
        expect(interrupts[0].payload.reason).toBe('USER_TAP');
      });
  });
});
