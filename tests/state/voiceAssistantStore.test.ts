/**
 * Voice FSM v2 unit tests (plan v2 §3.1.1 + §3.2 + §6.2 + §6.4 + §8.5).
 *
 * Coverage strategy:
 *   - Table-driven transition matrix: every (from, to) pair in the
 *     14-state space is asserted as either valid or invalid based on
 *     §3.2's Allowed-next column.
 *   - Identifier lifecycle: openBargeInWindow / freezeNewResponse /
 *     closeBargeInWindow / startUserTurn behave atomically and uphold
 *     the invariants in §6.4.
 *   - Rate-limit: openBargeInWindow within 500 ms is a no-op.
 *   - Atomicity of freezeNewResponse: no zustand subscriber observes
 *     an intermediate (bargeInWindowOpen=false, currentResponseId=null)
 *     snapshot.
 *   - DEV invariants reject the transition (do not crash) when
 *     ASSISTANT_SPEAKING is entered without a responseId.
 */

import {
  useVoiceAssistantStore,
  __resetBargeInRateLimit,
  __setRandomUUID,
  __getLastBargeInAtMs,
} from '../../src/state/voiceAssistantStore';
import type { VoiceState } from '../../src/state/voiceAssistantStore';

const ALL_STATES: VoiceState[] = [
  'IDLE',
  'PREPARING_AUDIO',
  'CONNECTING',
  'READY',
  'LISTENING',
  'USER_SPEAKING',
  'USER_SPEECH_FINALIZING',
  'WAITING_AI',
  'ASSISTANT_SPEAKING',
  'INTERRUPTED',
  'RECONNECTING',
  'ERROR_RECOVERABLE',
  'ERROR_FATAL',
  'ENDED',
];

/**
 * Allowed-next table copied from plan v2 §3.2. The store's
 * VALID_TRANSITIONS is a private const; we re-encode here so the test
 * suite is the source of truth from the spec's perspective and would
 * fail if the store drifts away from the spec.
 */
const EXPECTED_ALLOWED: Record<VoiceState, VoiceState[]> = {
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
  INTERRUPTED: ['LISTENING', 'USER_SPEAKING', 'ERROR_RECOVERABLE', 'ERROR_FATAL', 'ENDED'],
  RECONNECTING: ['READY', 'LISTENING', 'ERROR_RECOVERABLE', 'ERROR_FATAL', 'ENDED'],
  ERROR_RECOVERABLE: ['IDLE', 'CONNECTING', 'ENDED'],
  ERROR_FATAL: ['ENDED'],
  ENDED: ['PREPARING_AUDIO'],
};

/**
 * Force the store into a state for testing. Bypasses the transition()
 * validation so tests can assert behavior from any starting point.
 */
function forceState(s: VoiceState): void {
  useVoiceAssistantStore.setState({ state: s });
}

beforeEach(() => {
  useVoiceAssistantStore.getState().reset();
  __resetBargeInRateLimit();
  __setRandomUUID(() => 'test-uuid-fixed');
});

describe('VALID_TRANSITIONS table-driven matrix', () => {
  it('matches plan v2 §3.2 Allowed-next column exactly', () => {
    for (const from of ALL_STATES) {
      const allowed = EXPECTED_ALLOWED[from];
      for (const to of ALL_STATES) {
        forceState(from);
        // Set up invariant-friendly snapshot for the destination so the
        // §6.4 invariants don't reject the transition while we're
        // exercising the §3.2 allowed-next table. ASSISTANT_SPEAKING
        // requires currentResponseId !== null AND bargeInWindowOpen
        // === false; every other destination is invariant-neutral.
        if (to === 'ASSISTANT_SPEAKING') {
          useVoiceAssistantStore.setState({
            currentResponseId: 'rid-precondition',
            bargeInWindowOpen: false,
          });
        } else {
          useVoiceAssistantStore.setState({
            currentResponseId: null,
            bargeInWindowOpen: false,
          });
        }
        const expected = allowed.includes(to);
        // Self-transition is implicitly invalid (not listed in the spec
        // for any state). The store rejects it.
        const actual = useVoiceAssistantStore.getState().transition(to);
        expect({ from, to, actual }).toEqual({ from, to, actual: expected });
      }
    }
  });

  it('rejects every self-transition', () => {
    for (const s of ALL_STATES) {
      forceState(s);
      // Self-loop is rejected at the table level regardless of
      // invariants — none of the 14 rows lists itself in Allowed-next.
      expect(useVoiceAssistantStore.getState().transition(s)).toBe(false);
      expect(useVoiceAssistantStore.getState().state).toBe(s);
    }
  });

  it('allows ENDED from every non-error state', () => {
    const nonError = ALL_STATES.filter(
      (s) => s !== 'ERROR_RECOVERABLE' && s !== 'ERROR_FATAL' && s !== 'ENDED',
    );
    for (const s of nonError) {
      forceState(s);
      // ENDED is invariant-neutral.
      expect(useVoiceAssistantStore.getState().transition('ENDED')).toBe(true);
    }
  });

  it('ERROR_FATAL exits ONLY to ENDED (not IDLE, not CONNECTING)', () => {
    forceState('ERROR_FATAL');
    expect(useVoiceAssistantStore.getState().transition('IDLE')).toBe(false);
    forceState('ERROR_FATAL');
    expect(useVoiceAssistantStore.getState().transition('CONNECTING')).toBe(false);
    forceState('ERROR_FATAL');
    expect(useVoiceAssistantStore.getState().transition('ENDED')).toBe(true);
  });

  it('ERROR_RECOVERABLE allows auto-reset to IDLE and user-retry to CONNECTING', () => {
    forceState('ERROR_RECOVERABLE');
    expect(useVoiceAssistantStore.getState().transition('IDLE')).toBe(true);
    forceState('ERROR_RECOVERABLE');
    expect(useVoiceAssistantStore.getState().transition('CONNECTING')).toBe(true);
    forceState('ERROR_RECOVERABLE');
    expect(useVoiceAssistantStore.getState().transition('ENDED')).toBe(true);
  });

  it('ENDED only re-enters via PREPARING_AUDIO (no resurrect to IDLE)', () => {
    forceState('ENDED');
    expect(useVoiceAssistantStore.getState().transition('IDLE')).toBe(false);
    forceState('ENDED');
    expect(useVoiceAssistantStore.getState().transition('PREPARING_AUDIO')).toBe(true);
  });
});

describe('barge-in window lifecycle (§3.1.1)', () => {
  it('openBargeInWindow bumps epoch, nulls responseId, sets window=true', () => {
    useVoiceAssistantStore.setState({
      epoch: 5,
      currentResponseId: 'rid-old',
      bargeInWindowOpen: false,
    });

    const ok = useVoiceAssistantStore.getState().openBargeInWindow();
    expect(ok).toBe(true);

    const s = useVoiceAssistantStore.getState();
    expect(s.epoch).toBe(6);
    expect(s.currentResponseId).toBeNull();
    expect(s.bargeInWindowOpen).toBe(true);
  });

  it('freezeNewResponse atomically closes window AND sets responseId', () => {
    useVoiceAssistantStore.setState({
      bargeInWindowOpen: true,
      currentResponseId: null,
      epoch: 3,
    });

    let observedDuringSet: { open: boolean; rid: string | null } | null = null;
    const unsub = useVoiceAssistantStore.subscribe((s) => {
      // Snapshot what subscribers see; with atomic set() they should
      // ONLY see the post-state, never the intermediate.
      observedDuringSet = {
        open: s.bargeInWindowOpen,
        rid: s.currentResponseId,
      };
    });

    useVoiceAssistantStore.getState().freezeNewResponse('rid-new');
    unsub();

    // No subscriber callback should have observed (open=false, rid=null)
    // — both fields flip in one set() call.
    expect(observedDuringSet).toEqual({ open: false, rid: 'rid-new' });

    const s = useVoiceAssistantStore.getState();
    expect(s.bargeInWindowOpen).toBe(false);
    expect(s.currentResponseId).toBe('rid-new');
    // freezeNewResponse does NOT bump epoch — only barge-in does.
    expect(s.epoch).toBe(3);
  });

  it('closeBargeInWindow only flips the flag (no responseId mint)', () => {
    useVoiceAssistantStore.setState({
      bargeInWindowOpen: true,
      currentResponseId: null,
      epoch: 7,
    });

    useVoiceAssistantStore.getState().closeBargeInWindow();

    const s = useVoiceAssistantStore.getState();
    expect(s.bargeInWindowOpen).toBe(false);
    expect(s.currentResponseId).toBeNull();
    expect(s.epoch).toBe(7);
  });

  it('startUserTurn mints and assigns currentUserTurnId', () => {
    __setRandomUUID(() => 'user-turn-42');
    const id = useVoiceAssistantStore.getState().startUserTurn();
    expect(id).toBe('user-turn-42');
    expect(useVoiceAssistantStore.getState().currentUserTurnId).toBe('user-turn-42');
  });
});

describe('barge-in 500 ms rate limit (§8.5)', () => {
  it('coalesces a second openBargeInWindow within 500 ms', () => {
    const realDateNow = Date.now;
    let now = 1_000;
    Date.now = () => now;
    try {
      __resetBargeInRateLimit();
      const first = useVoiceAssistantStore.getState().openBargeInWindow();
      expect(first).toBe(true);
      const epoch1 = useVoiceAssistantStore.getState().epoch;
      const ts1 = __getLastBargeInAtMs();

      now = 1_400; // +400 ms — under the 500 ms gate
      const second = useVoiceAssistantStore.getState().openBargeInWindow();
      expect(second).toBe(false);

      // Epoch unchanged; rate-limit timestamp unchanged.
      expect(useVoiceAssistantStore.getState().epoch).toBe(epoch1);
      expect(__getLastBargeInAtMs()).toBe(ts1);
    } finally {
      Date.now = realDateNow;
    }
  });

  it('admits the second openBargeInWindow at exactly +500 ms', () => {
    const realDateNow = Date.now;
    let now = 2_000;
    Date.now = () => now;
    try {
      __resetBargeInRateLimit();
      useVoiceAssistantStore.getState().openBargeInWindow();
      const epoch1 = useVoiceAssistantStore.getState().epoch;

      now = 2_500; // +500 ms — at the boundary; spec says "< 500" coalesces, "≥ 500" fires.
      const second = useVoiceAssistantStore.getState().openBargeInWindow();
      expect(second).toBe(true);
      expect(useVoiceAssistantStore.getState().epoch).toBe(epoch1 + 1);
    } finally {
      Date.now = realDateNow;
    }
  });

  it('coalesces tap + server-interrupt within 500 ms (single chokepoint)', () => {
    // Per §8.5: tap and server-interrupt both flow through openBargeInWindow,
    // so the rate-limit applies regardless of caller intent.
    const realDateNow = Date.now;
    let now = 5_000;
    Date.now = () => now;
    try {
      __resetBargeInRateLimit();
      // Simulate user tap
      expect(useVoiceAssistantStore.getState().openBargeInWindow()).toBe(true);
      now = 5_100;
      // Simulate serverContent.interrupted arriving 100 ms later
      expect(useVoiceAssistantStore.getState().openBargeInWindow()).toBe(false);
      expect(useVoiceAssistantStore.getState().epoch).toBe(1);
    } finally {
      Date.now = realDateNow;
    }
  });
});

describe('DEV invariants (§6.4)', () => {
  it('rejects ASSISTANT_SPEAKING when currentResponseId is null', () => {
    forceState('WAITING_AI');
    useVoiceAssistantStore.setState({
      currentResponseId: null,
      bargeInWindowOpen: false,
    });
    expect(useVoiceAssistantStore.getState().transition('ASSISTANT_SPEAKING')).toBe(false);
    expect(useVoiceAssistantStore.getState().state).toBe('WAITING_AI');
  });

  it('rejects ASSISTANT_SPEAKING when bargeInWindowOpen is true', () => {
    forceState('WAITING_AI');
    useVoiceAssistantStore.setState({
      currentResponseId: 'rid-zombie',
      bargeInWindowOpen: true,
    });
    expect(useVoiceAssistantStore.getState().transition('ASSISTANT_SPEAKING')).toBe(false);
  });

  it('admits ASSISTANT_SPEAKING when invariants hold', () => {
    forceState('WAITING_AI');
    useVoiceAssistantStore.setState({
      currentResponseId: 'rid-good',
      bargeInWindowOpen: false,
    });
    expect(useVoiceAssistantStore.getState().transition('ASSISTANT_SPEAKING')).toBe(true);
    expect(useVoiceAssistantStore.getState().state).toBe('ASSISTANT_SPEAKING');
  });
});

describe('store does NOT schedule timers (lint rule §11.7 spirit)', () => {
  it('transition() does not call setTimeout', () => {
    const real = global.setTimeout;
    let calls = 0;
    // @ts-expect-error — partial monkey patch is intentional
    global.setTimeout = (...args: unknown[]) => {
      calls += 1;
      // @ts-expect-error
      return real(...args);
    };
    try {
      forceState('LISTENING');
      useVoiceAssistantStore.getState().transition('ERROR_RECOVERABLE');
      // The v1 store armed setTimeout(5000) on ERROR entry; v2 must not.
      expect(calls).toBe(0);
    } finally {
      global.setTimeout = real;
    }
  });
});

describe('stopSession resets v2 identifiers (§3.1.1)', () => {
  it('clears sessionId, epoch, currentUserTurnId, currentResponseId, bargeInWindowOpen', () => {
    useVoiceAssistantStore.setState({
      sessionId: 'sess-7',
      epoch: 12,
      currentUserTurnId: 'turn-3',
      currentResponseId: 'rid-99',
      bargeInWindowOpen: true,
      messages: [{ role: 'user', text: 'hi', ts: 1 }],
    });
    useVoiceAssistantStore.getState().stopSession();
    const s = useVoiceAssistantStore.getState();
    expect(s.sessionId).toBeNull();
    expect(s.epoch).toBe(0);
    expect(s.currentUserTurnId).toBeNull();
    expect(s.currentResponseId).toBeNull();
    expect(s.bargeInWindowOpen).toBe(false);
    // messages preserved across stopSession (existing v1 behavior).
    expect(s.messages.length).toBe(1);
  });
});
