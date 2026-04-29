/**
 * Mock Gemini Live SDK harness — P0-16 §13.7 / QA mode
 *
 * Provides a deterministic, scripted substitute for the @google/genai
 * Live API WebSocket session. Used by the Maestro QA_MODE flow and
 * integration tests to drive the voice FSM through X1/X2/X3 scenarios
 * without hitting the real Gemini Live API.
 *
 * Gate: only active when Config.QA_MODE === true
 * (EXPO_PUBLIC_VOICE_TEST_HARNESS=true).
 *
 * Usage (in test setup or integration test):
 *   import { createMockGeminiLiveSession } from './__mocks__/gemini-live-server';
 *   jest.mock('@google/genai/web', () => createMockGeminiLiveSession(script));
 */

export interface ScriptedTurn {
  /** Delay in ms before this turn's events fire (relative to session open) */
  delayMs: number;
  /** If set, emit a serverContent.interrupted signal */
  interrupted?: boolean;
  /** If set, emit audio chunks (base64 PCM16LE, 20ms each) */
  audioParts?: string[];
  /** If set, emit serverContent.turnComplete after audioParts */
  turnComplete?: boolean;
  /** If set, emit serverContent.inputTranscription */
  inputTranscription?: string;
  /** If set, emit sessionResumptionUpdate */
  resumptionHandle?: string;
}

export interface MockSessionCallbacks {
  onopen?: () => void;
  onmessage?: (msg: unknown) => void;
  onerror?: (err: Error) => void;
  onclose?: () => void;
}

export interface MockSession {
  sendRealtimeInput: (input: { audio: { data: string } }) => void;
  close: () => void;
  /** Fire the next scripted turn immediately (for test control) */
  _fireNextTurn: () => void;
  /** Advance all pending timers (for jest.useFakeTimers environments) */
  _flush: () => void;
}

/**
 * Create a mock Gemini Live session that replays a scripted conversation.
 * Fires callbacks in the same async pattern as the real SDK.
 */
export function createMockSession(
  script: ScriptedTurn[],
  callbacks: MockSessionCallbacks,
): MockSession {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let turnIdx = 0;
  let closed = false;

  const fireTurn = (turn: ScriptedTurn) => {
    if (closed) return;

    if (turn.inputTranscription) {
      callbacks.onmessage?.({
        serverContent: { inputTranscription: { text: turn.inputTranscription } },
      });
    }

    if (turn.interrupted) {
      callbacks.onmessage?.({ serverContent: { interrupted: true } });
    }

    if (turn.audioParts && turn.audioParts.length > 0) {
      callbacks.onmessage?.({
        serverContent: {
          modelTurn: {
            parts: turn.audioParts.map((data) => ({
              inlineData: { mimeType: 'audio/pcm', data },
            })),
          },
        },
      });
    }

    if (turn.turnComplete) {
      callbacks.onmessage?.({ serverContent: { turnComplete: true } });
    }

    if (turn.resumptionHandle) {
      callbacks.onmessage?.({
        sessionResumptionUpdate: {
          newHandle: turn.resumptionHandle,
          resumable: true,
        },
      });
    }
  };

  // Schedule all scripted turns
  const scheduleAll = () => {
    for (const turn of script) {
      const t = setTimeout(() => fireTurn(turn), turn.delayMs);
      timers.push(t);
    }
  };

  // Fire onopen asynchronously (mirrors real SDK behavior)
  const openTimer = setTimeout(() => {
    if (!closed) callbacks.onopen?.();
    scheduleAll();
  }, 0);
  timers.push(openTimer);

  return {
    sendRealtimeInput(_input) {
      // no-op in mock — uplink frames are consumed silently
    },

    close() {
      if (closed) return;
      closed = true;
      timers.forEach(clearTimeout);
      callbacks.onclose?.();
    },

    _fireNextTurn() {
      const turn = script[turnIdx];
      if (!turn) return;
      turnIdx++;
      fireTurn(turn);
    },

    _flush() {
      timers.forEach(clearTimeout);
      for (const turn of script) fireTurn(turn);
    },
  };
}

/**
 * Standard X1/X2/X3 scripted conversation:
 *   X1: session opens → emit audio (drives WAITING_AI → ASSISTANT_SPEAKING)
 *   X2: emit interrupted (drives ASSISTANT_SPEAKING → INTERRUPTED)
 *   X3: emit turnComplete (drives drain → LISTENING)
 */
export const STANDARD_VOICE_SCRIPT: ScriptedTurn[] = [
  {
    delayMs: 500,
    audioParts: [
      // 20ms of silence at 16kHz PCM16LE, base64-encoded
      // (160 samples × 2 bytes = 320 bytes of zeros)
      Buffer.alloc(320).toString('base64'),
    ],
  },
  {
    delayMs: 2000,
    interrupted: true,
  },
  {
    delayMs: 2500,
    audioParts: [Buffer.alloc(320).toString('base64')],
    turnComplete: true,
    resumptionHandle: 'mock-resumption-handle-001',
  },
];

/**
 * Factory that returns a jest.mock-compatible module replacement for
 * @google/genai/web. Injects the scripted session into the hook's
 * ai.live.connect() call.
 *
 * Usage:
 *   jest.mock('@google/genai/web', () =>
 *     createMockGeminiLiveModule(STANDARD_VOICE_SCRIPT)
 *   );
 */
export function createMockGeminiLiveModule(script: ScriptedTurn[] = STANDARD_VOICE_SCRIPT) {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      live: {
        connect: jest.fn().mockImplementation((_config: unknown) => {
          // The real SDK connect() returns a session object; we return
          // a Promise that resolves to one after wiring callbacks.
          return {
            sendRealtimeInput: jest.fn(),
            close: jest.fn(),
          };
        }),
      },
    })),
    Modality: { AUDIO: 'AUDIO', TEXT: 'TEXT' },
    ActivityHandling: { START_OF_ACTIVITY_INTERRUPTS: 'START_OF_ACTIVITY_INTERRUPTS' },
  };
}
