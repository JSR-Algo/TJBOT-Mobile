import { create } from 'zustand';

/** Maximum in-memory messages retained per voice session (COPPA/PII safety). */
export const VOICE_MESSAGE_HISTORY_CAP = 50;

/**
 * Voice FSM v2 — 14 states (plan v2 §3.2). The store is the canonical
 * authority for what state we are in and which next state is allowed; it
 * does NOT own timers (plan §6.3) — the hook arms timers via React
 * useEffect cleanup contract, lint rule §11.7 enforces no setTimeout in
 * src/state/.
 *
 * State semantics (plan v2 §3.2 row-by-row, UPPERCASE preserved by
 * agreement with team-lead 2026-04-28; lowercase prose in plan is
 * convention, not wire contract):
 *
 *   IDLE                     "Tap to start"
 *   PREPARING_AUDIO          VoiceSession.start() pending; spinner
 *   CONNECTING               token + ai.live.connect; spinner
 *   READY                    VoiceMic.start() pending mic engine ready event
 *   LISTENING                mic running, no speech detected
 *   USER_SPEAKING            voiceMicVadStart edge; mints UserTurnId
 *   USER_SPEECH_FINALIZING   voiceMicVadEnd edge; "Thinking" UI; finalizing_grace 1s
 *   WAITING_AI               first-chunk pending; mic still running
 *   ASSISTANT_SPEAKING       voicePlaybackStarted for currentResponseId; "Speaking"
 *   INTERRUPTED              barge-in (user/server); clear() in flight
 *   RECONNECTING             goAway / ws error; resumption handle replay
 *   ERROR_RECOVERABLE        auto-reset via hook timer (recoverable_auto_reset 5s)
 *   ERROR_FATAL              user must ack; only exit is ENDED
 *   ENDED                    user.stop final terminal until next session
 *
 * Identifiers (plan v2 §3.1):
 *   sessionId           — minted at startConversation; survives reconnect
 *   epoch               — monotonic counter, bumped on every barge-in event
 *   currentUserTurnId   — minted on USER_SPEAKING entry; preserved across
 *                          reconnect iff still mid-utterance
 *   currentResponseId   — minted atomically with closing the barge-in window
 *                          (freezeNewResponse). Nulled on barge-in.
 *   bargeInWindowOpen   — true ⇒ currentResponseId === null. Stale chunks
 *                          arriving in this window are dropped at JS.
 */

export type VoiceState =
  | 'IDLE'
  | 'PREPARING_AUDIO'
  | 'CONNECTING'
  | 'READY'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'USER_SPEECH_FINALIZING'
  | 'WAITING_AI'
  | 'ASSISTANT_SPEAKING'
  | 'INTERRUPTED'
  | 'RECONNECTING'
  | 'ERROR_RECOVERABLE'
  | 'ERROR_FATAL'
  | 'ENDED';

export type AudioMode = 'unknown' | 'fast' | 'cautious' | 'full_buffer';

/**
 * FSM deadline-timer configuration (plan v2 §3.2 + §6.3).
 * The store owns the table and the timeout action; hooks own the
 * setTimeout scheduling (lint rule §11.7). Centralising the table
 * makes the timer behaviour testable without mounting React effects.
 */
export interface FsmTimerConfig {
  deadlineMs: number;
  fallbackState: VoiceState;
  errorMessage?: string;
  metricEvent: string;
}

export type SessionId = string;
export type Epoch = number;
export type UserTurnId = string;
export type ResponseId = string;

/**
 * Allowed-next per plan v2 §3.2. Every non-error state allows ENDED
 * (user.stop). ERROR_FATAL exits ONLY to ENDED (no auto-reset to IDLE).
 * ERROR_RECOVERABLE auto-resets to IDLE via hook timer; user retry
 * exits to CONNECTING.
 */
const VALID_TRANSITIONS: Record<VoiceState, readonly VoiceState[]> = {
  IDLE: ['PREPARING_AUDIO', 'ENDED'],
  PREPARING_AUDIO: ['CONNECTING', 'ERROR_RECOVERABLE', 'ENDED'],
  CONNECTING: ['READY', 'ERROR_RECOVERABLE', 'ENDED'],
  READY: ['LISTENING', 'ERROR_RECOVERABLE', 'ENDED'],
  LISTENING: [
    'USER_SPEAKING',
    'ASSISTANT_SPEAKING',
    'RECONNECTING',
    'INTERRUPTED',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  USER_SPEAKING: [
    'USER_SPEECH_FINALIZING',
    'ASSISTANT_SPEAKING',
    'INTERRUPTED',
    'RECONNECTING',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  USER_SPEECH_FINALIZING: [
    'WAITING_AI',
    'USER_SPEAKING',
    'INTERRUPTED',
    'LISTENING',
    'RECONNECTING',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  WAITING_AI: [
    'ASSISTANT_SPEAKING',
    'LISTENING',
    'INTERRUPTED',
    'RECONNECTING',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  ASSISTANT_SPEAKING: [
    'INTERRUPTED',
    'LISTENING',
    'RECONNECTING',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  INTERRUPTED: [
    'LISTENING',
    'USER_SPEAKING',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  RECONNECTING: [
    'READY',
    'LISTENING',
    'ERROR_RECOVERABLE',
    'ERROR_FATAL',
    'ENDED',
  ],
  ERROR_RECOVERABLE: ['IDLE', 'CONNECTING', 'ENDED'],
  ERROR_FATAL: ['ENDED'],
  ENDED: ['PREPARING_AUDIO'],
};

/**
 * Per-state deadline timers (plan v2 §3.2 + §6.3). The store is the
 * source of truth for *which* timers exist and *what* they do; hooks
 * are only responsible for arming/clearing the setTimeout.
 */
export const FSM_TIMER_TABLE: Partial<Record<VoiceState, FsmTimerConfig>> = {
  PREPARING_AUDIO: {
    deadlineMs: 4000,
    fallbackState: 'ERROR_RECOVERABLE',
    errorMessage: 'Microphone is taking too long to start. Tap the robot button to try again.',
    metricEvent: 'voice.fsm.timeout',
  },
  CONNECTING: {
    deadlineMs: 10_000,
    fallbackState: 'ERROR_RECOVERABLE',
    errorMessage: 'Robot voice is taking too long to connect. Check Wi‑Fi and try again.',
    metricEvent: 'voice.fsm.timeout',
  },
  READY: {
    deadlineMs: 2000,
    fallbackState: 'ERROR_RECOVERABLE',
    errorMessage: 'Microphone is not ready yet. Close other apps using the mic, then tap the robot button.',
    metricEvent: 'voice.fsm.timeout',
  },
  USER_SPEAKING: {
    deadlineMs: 30_000,
    fallbackState: 'ERROR_RECOVERABLE',
    errorMessage: 'VAD bị kẹt.',
    metricEvent: 'voice.fsm.timeout',
  },
  USER_SPEECH_FINALIZING: {
    deadlineMs: 1000,
    fallbackState: 'LISTENING',
    metricEvent: 'voice.fsm.timeout',
  },
  WAITING_AI: {
    deadlineMs: 8000,
    fallbackState: 'LISTENING',
    metricEvent: 'voice.fsm.timeout',
  },
  RECONNECTING: {
    deadlineMs: 8000,
    fallbackState: 'ERROR_RECOVERABLE',
    errorMessage: 'Kết nối lại quá chậm.',
    metricEvent: 'voice.fsm.timeout',
  },
  INTERRUPTED: {
    deadlineMs: 800,
    fallbackState: 'ERROR_RECOVERABLE',
    errorMessage: 'Ngắt audio không phản hồi.',
    metricEvent: 'voice.assistant_turn.interrupted_timeout',
  },
  ERROR_RECOVERABLE: {
    deadlineMs: 5000,
    fallbackState: 'IDLE',
    metricEvent: 'voice.recoverable_auto_reset',
  },
};

/**
 * DEV-only invariant assertions per plan v2 §6.4. Returns null when the
 * candidate next-state is consistent with the snapshot, or a string error
 * message when an invariant would be violated. Hook should log + skip the
 * transition rather than crash — rejection is non-fatal.
 *
 * Note: invariants are evaluated against the candidate POST-state by
 * synthesizing what the snapshot would look like after the set() call.
 * The transition() implementation calls this BEFORE applying state changes
 * so violations are caught without dirtying the store.
 */
function checkInvariants(
  next: VoiceState,
  snapshot: Pick<VoiceAssistantStore, 'currentResponseId' | 'bargeInWindowOpen' | 'epoch'>,
  prevEpoch: Epoch,
): string | null {
  // Invariant E0 — epoch monotonic non-decreasing.
  if (snapshot.epoch < prevEpoch) {
    return `epoch decreased: ${prevEpoch} → ${snapshot.epoch}`;
  }
  // Invariant W1 — bargeInWindowOpen=true ⇒ currentResponseId=null.
  if (snapshot.bargeInWindowOpen && snapshot.currentResponseId !== null) {
    return `bargeInWindowOpen=true but currentResponseId=${snapshot.currentResponseId}`;
  }
  // Invariant A1 — ASSISTANT_SPEAKING ⇒ currentResponseId !== null AND
  // bargeInWindowOpen === false.
  if (next === 'ASSISTANT_SPEAKING') {
    if (snapshot.currentResponseId === null) {
      return 'ASSISTANT_SPEAKING requires currentResponseId !== null';
    }
    if (snapshot.bargeInWindowOpen) {
      return 'ASSISTANT_SPEAKING requires bargeInWindowOpen === false';
    }
  }
  return null;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  ts: number;
  interrupted?: boolean;
}

export interface VoiceAssistantStore {
  // ─── FSM state ─────────────────────────────────────────────────────
  state: VoiceState;
  // ─── v2 identifiers (§3.1) ─────────────────────────────────────────
  sessionId: SessionId | null;
  epoch: Epoch;
  currentUserTurnId: UserTurnId | null;
  currentResponseId: ResponseId | null;
  bargeInWindowOpen: boolean;
  // ─── UI surface (unchanged from v1) ────────────────────────────────
  userTranscript: string;
  aiTranscript: string;
  messages: Message[];
  audioLevel: number;
  error: string | null;
  sessionStartTime: number | null;
  expressionOverride: string | null;
  audioMode: AudioMode;
  /**
   * True while the playback service is refilling after an underrun.
   * UI flag only — not an FSM state. Drives subtle buffering cues.
   */
  isBuffering: boolean;
  /**
   * True when the playback layer reports a sustained underrun.
   * Drives the "mạng yếu" banner. UI flag only.
   */
  isPoorNetwork: boolean;

  // ─── Actions ───────────────────────────────────────────────────────
  transition: (to: VoiceState) => boolean;
  /**
   * Single entry point for tap-to-interrupt and serverContent.interrupted.
   * Rate-limited at the action site (plan §8.5): a second call within
   * 500 ms of the previous one is a no-op. Bumps epoch, nulls
   * currentResponseId, sets bargeInWindowOpen=true. Does NOT mutate FSM
   * state — caller arranges the INTERRUPTED transition separately.
   */
  openBargeInWindow: () => boolean;
  /**
   * Close the barge-in window without minting a new responseId. Used
   * defensively by the hook when transitioning to LISTENING after a
   * silent server response (turnComplete with zero chunks).
   */
  closeBargeInWindow: () => void;
  /**
   * ATOMIC: closes the barge-in window AND sets currentResponseId in a
   * single set() call. The atomicity matters — without it, a concurrent
   * re-render can observe the intermediate state where the window is
   * still open but the responseId is already minted, and drop the chunk
   * we just minted for. Plan v2 §3.1.1, §6.2.
   */
  freezeNewResponse: (rid: ResponseId) => void;
  /**
   * Mint a new UserTurnId and return it. Caller assigns it to
   * currentUserTurnId via direct set call when entering USER_SPEAKING.
   * Returning the id (rather than just mutating) lets the caller stamp
   * it into native modules as well.
   */
  startUserTurn: () => UserTurnId;
  setSessionId: (id: SessionId | null) => void;
  setUserTranscript: (text: string) => void;
  setAiTranscript: (text: string) => void;
  addMessage: (role: 'user' | 'ai', text: string, interrupted?: boolean) => void;
  setAudioLevel: (level: number) => void;
  setError: (error: string | null) => void;
  setExpressionOverride: (expr: string | null) => void;
  setAudioMode: (mode: AudioMode) => void;
  setIsBuffering: (buffering: boolean) => void;
  setIsPoorNetwork: (poor: boolean) => void;
  stopSession: () => void;
  reset: () => void;
  /**
   * Read-only lookup for the FSM deadline timer attached to a state.
   * Returns null when the state has no deadline (e.g. IDLE, LISTENING).
   */
  getFsmTimerConfig: (state: VoiceState) => FsmTimerConfig | null;
  /**
   * Apply the timeout action for a state. Safe to call when the FSM has
   * already left the state — transition() will simply return false.
   */
  onFsmTimerExpired: (state: VoiceState) => void;
}

const INITIAL_STATE = {
  state: 'IDLE' as VoiceState,
  sessionId: null as SessionId | null,
  epoch: 0 as Epoch,
  currentUserTurnId: null as UserTurnId | null,
  currentResponseId: null as ResponseId | null,
  bargeInWindowOpen: false,
  userTranscript: '',
  aiTranscript: '',
  messages: [] as Message[],
  audioLevel: 0,
  error: null as string | null,
  sessionStartTime: null as number | null,
  expressionOverride: null as string | null,
  audioMode: 'unknown' as AudioMode,
  isBuffering: false,
  isPoorNetwork: false,
};

/**
 * Module-scope rate-limit timestamp (plan v2 §8.5). Lives outside the
 * store because (a) it's a guard, not state the UI cares about, and
 * (b) tap and server-interrupt callsites flow through openBargeInWindow,
 * so the guard belongs at that one chokepoint. Tests can reset by
 * exporting __resetBargeInRateLimit (only used in tests).
 */
let lastBargeInAtMs = 0;
const BARGE_IN_MIN_INTERVAL_MS = 500;

/** Test-only: reset the module-scope rate-limit clock. */
export function __resetBargeInRateLimit(): void {
  lastBargeInAtMs = 0;
}

/** Test-only: read the module-scope rate-limit clock. */
export function __getLastBargeInAtMs(): number {
  return lastBargeInAtMs;
}

let randomUUIDFn: () => string = () => {
  // Crypto.randomUUID is in RN 0.83 via globalThis. Falls back to a
  // best-effort random in environments where it's missing (jsdom-based
  // jest under older RN versions). Production path always hits the
  // native crypto module.
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Test-only: override the UUID generator to make ids deterministic. */
export function __setRandomUUID(fn: () => string): void {
  randomUUIDFn = fn;
}

export const useVoiceAssistantStore = create<VoiceAssistantStore>((set, get) => ({
  ...INITIAL_STATE,

  transition: (to: VoiceState): boolean => {
    const current = get().state;
    const valid = VALID_TRANSITIONS[current];
    if (!valid.includes(to)) {
      return false;
    }

    if (__DEV__) {
      const snap = get();
      const violation = checkInvariants(
        to,
        {
          currentResponseId: snap.currentResponseId,
          bargeInWindowOpen: snap.bargeInWindowOpen,
          epoch: snap.epoch,
        },
        snap.epoch,
      );
      if (violation) {
        return false;
      }
    }

    set({ state: to });

    // ───── Auto-actions on state entry (plan v2 §3.2 / §6.3) ─────────
    // sessionStartTime is a UI timer for the existing latency banner;
    // safe to keep in the store. Stamp on first entry to PREPARING_AUDIO,
    // not on every re-entry.
    if (to === 'PREPARING_AUDIO' && !get().sessionStartTime) {
      set({ sessionStartTime: Date.now() });
    }
    // The v1 setTimeout(5000) ERROR auto-reset is REMOVED. The hook owns
    // the recoverable_auto_reset timer per plan v2 §6.3 row 6 via a
    // useEffect keyed on state==='ERROR_RECOVERABLE'.
    return true;
  },

  openBargeInWindow: () => {
    const now = Date.now();
    if (now - lastBargeInAtMs < BARGE_IN_MIN_INTERVAL_MS) {
      // Coalesced — neither tap nor server-interrupt can drive a second
      // epoch bump within 500 ms (plan §8.5). No state change; caller
      // checks return value for telemetry.
      return false;
    }
    lastBargeInAtMs = now;
    set((s) => ({
      epoch: s.epoch + 1,
      currentResponseId: null,
      bargeInWindowOpen: true,
    }));
    return true;
  },

  closeBargeInWindow: () => set({ bargeInWindowOpen: false }),

  freezeNewResponse: (rid: ResponseId) => {
    // Single set() call — atomic w.r.t. selectors. No intermediate
    // state where bargeInWindowOpen=false but currentResponseId=null
    // is observable (plan v2 §3.1.1, §6.2). epoch is intentionally
    // unchanged: window-close does not arm a new generation; only
    // openBargeInWindow does.
    set({
      bargeInWindowOpen: false,
      currentResponseId: rid,
    });
  },

  startUserTurn: (): UserTurnId => {
    const id = randomUUIDFn();
    set({ currentUserTurnId: id });
    return id;
  },

  setSessionId: (id: SessionId | null) => set({ sessionId: id }),

  setUserTranscript: (text: string) => set({ userTranscript: text }),
  setAiTranscript: (text: string) => set({ aiTranscript: text }),

  addMessage: (role: 'user' | 'ai', text: string, interrupted?: boolean) => {
    if (!text.trim()) return;
    set((s) => {
      const nextMessages = [
        ...s.messages,
        { role, text: text.trim(), ts: Date.now(), ...(interrupted ? { interrupted } : {}) },
      ];
      if (nextMessages.length > VOICE_MESSAGE_HISTORY_CAP) {
        nextMessages.splice(0, nextMessages.length - VOICE_MESSAGE_HISTORY_CAP);
      }
      return {
        messages: nextMessages,
        ...(role === 'user' ? { userTranscript: '' } : { aiTranscript: '' }),
      };
    });
  },

  setAudioLevel: (level: number) => set({ audioLevel: Math.max(0, Math.min(1, level)) }),

  setError: (error: string | null) => set({ error }),

  setExpressionOverride: (expr: string | null) => set({ expressionOverride: expr }),

  setAudioMode: (mode: AudioMode) => set({ audioMode: mode }),

  setIsBuffering: (buffering: boolean) => set({ isBuffering: buffering }),

  setIsPoorNetwork: (poor: boolean) => set({ isPoorNetwork: poor }),

  stopSession: () =>
    set((s) => ({
      state: 'IDLE',
      sessionId: null,
      epoch: 0,
      currentUserTurnId: null,
      currentResponseId: null,
      bargeInWindowOpen: false,
      userTranscript: '',
      aiTranscript: '',
      audioLevel: 0,
      error: null,
      sessionStartTime: null,
      expressionOverride: null,
      audioMode: 'unknown',
      isBuffering: false,
      isPoorNetwork: false,
      messages: s.messages,
    })),

  reset: () => set(INITIAL_STATE),

  getFsmTimerConfig: (state: VoiceState): FsmTimerConfig | null =>
    FSM_TIMER_TABLE[state] ?? null,

  onFsmTimerExpired: (state: VoiceState): void => {
    const config = FSM_TIMER_TABLE[state];
    if (!config) return;
    if (config.errorMessage) {
      set({ error: config.errorMessage });
    }
    // WAITING_AI timeout closes the barge-in window so the next user
    // utterance starts a fresh generation rather than a stale one.
    if (state === 'WAITING_AI') {
      set({ bargeInWindowOpen: false });
    }
    get().transition(config.fallbackState);
  },
}));
