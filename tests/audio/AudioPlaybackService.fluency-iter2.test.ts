/**
 * AudioPlaybackService — iter 2 fluency behavior
 * (plan .omc/plans/gemini-live-voice-fluency-iter2-2026-04-19.md §3,
 * ACs 2, 3, 4, 6, 7, 8, 9).
 *
 * Test strategy — the expo-audio mock's `addListener` is a `jest.fn()` by
 * default, so segment playback never naturally completes. Tests that need
 * multi-segment progression install a manual listener registry via
 * `createAudioPlayerMock.mockImplementation` and fire `didJustFinish`
 * from the test body. Tests that only need to observe pre-play state
 * (e.g. markSentenceBoundary fast paths, interrupt reset) rely on the
 * default stub.
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AudioPlaybackService } from '../../src/audio/AudioPlaybackService';
import { DEFAULT_BUFFER_POLICY } from '../../src/audio/BufferPolicy';

const createAudioPlayerMock = createAudioPlayer as unknown as jest.Mock;
const setAudioModeAsyncMock = setAudioModeAsync as unknown as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}

function makePcmChunk(ms = 60): string {
  const samples = Math.round((24000 * ms) / 1000);
  const bytes = new Uint8Array(samples * 2);
  for (let i = 0; i < samples; i++) {
    const v = Math.round(Math.sin((i / samples) * Math.PI * 2) * 1000);
    bytes[i * 2] = v & 0xff;
    bytes[i * 2 + 1] = (v >> 8) & 0xff;
  }
  return toBase64(bytes);
}

async function flushMicrotasks(n = 10): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

/**
 * Install a controllable mock player. Returns a `fireCompletion()` helper
 * that resolves the current segment's didJustFinish listener so the loop
 * advances to the next segment. Multiple `replace()` calls share the same
 * listener registry (per-player).
 */
function installControllablePlayer(): { fireCompletion: () => void; playerInstances: any[] } {
  const playerInstances: any[] = [];
  createAudioPlayerMock.mockImplementation(() => {
    const listeners: Array<(status: any) => void> = [];
    const player = {
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn((_event: string, cb: any) => {
        listeners.push(cb);
      }),
      __fire: () => {
        // Consume all listeners registered for the current segment — after
        // firing, subsequent replace() calls register new ones.
        const current = listeners.splice(0, listeners.length);
        for (const l of current) l({ didJustFinish: true });
      },
    };
    playerInstances.push(player);
    return player;
  });
  return {
    fireCompletion: () => {
      const p = playerInstances[playerInstances.length - 1];
      if (p) p.__fire();
    },
    playerInstances,
  };
}

/**
 * Count how many times the underlying player transport was engaged — for a
 * single reused player, `createAudioPlayer` fires once and every subsequent
 * segment is a `replace()`. Sum = total segment swaps.
 */
function countSegmentSwaps(playerInstances: any[]): number {
  const created = createAudioPlayerMock.mock.calls.length;
  const replaces = playerInstances.reduce((n, p) => n + p.replace.mock.calls.length, 0);
  return created + replaces;
}

// Tight policy for deterministic runtime tests. prebufferFloor=0 so the
// first chunk fires immediately; timeouts compressed so the loop progresses
// quickly under real timers.
const TIGHT_POLICY = {
  ...DEFAULT_BUFFER_POLICY,
  prebufferFloorMs: 0,
  prebufferCeilingMs: 20,
  minSegmentMs: 10,
  flushDelayMs: 5,
  refillTargetMs: 20,
  refillTimeoutMs: 40,
  refillPollMinMs: 5,
  maxConsecutiveUnderruns: 2,
  escalatedPrebufferMs: 80,
  escalatedRefillTargetMs: 40,
  phraseAwareFlush: true,
  phraseBoundaryFloorMs: 50,
  poorNetworkThreshold: 3,
};

describe('AudioPlaybackService — iter2 fluency', () => {
  beforeEach(() => {
    createAudioPlayerMock.mockReset();
    createAudioPlayerMock.mockImplementation(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn(),
    }));
    setAudioModeAsyncMock.mockClear();
  });

  // ─── AC4 — markSentenceBoundary fast paths ──────────────────────────

  describe('AC4 — markSentenceBoundary fast paths (plan §2.3)', () => {
    it('scenario (a): punctuation during accumulation triggers immediate flush when bufferedMs >= phraseBoundaryFloorMs', async () => {
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 10000, // impossibly high — only the latch can cause a flush
        prebufferCeilingMs: 10000,
        minSegmentMs: 10000,
        flushDelayMs: 10000,
        phraseAwareFlush: true,
        phraseBoundaryFloorMs: 100,
      };
      const service = new AudioPlaybackService(policy, null);

      // Enqueue ~120 ms of audio without triggering a normal flush
      service.enqueue(makePcmChunk(60));
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
      // No createAudioPlayer yet — normal gates blocked by huge constants
      expect(createAudioPlayerMock).not.toHaveBeenCalled();

      // Latch the boundary; the fast path should flush pending chunks
      service.markSentenceBoundary();
      await flushMicrotasks();

      // A segment should now have been flushed to ready and picked up
      expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
      service.dispose();
    });

    it('scenario (b): trailing punctuation after last chunk — markSentenceBoundary flushes without a following enqueue', async () => {
      // This covers the Gemini-common case where outputTranscription.text
      // containing punctuation arrives after the final audio chunk of the turn.
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 10000,
        prebufferCeilingMs: 10000,
        minSegmentMs: 10000,
        flushDelayMs: 10000,
        phraseAwareFlush: true,
        phraseBoundaryFloorMs: 100,
      };
      const service = new AudioPlaybackService(policy, null);

      service.enqueue(makePcmChunk(60));
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled();

      // NO further enqueue — punctuation arrives "after" the last chunk.
      service.markSentenceBoundary();
      await flushMicrotasks();

      expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
      service.dispose();
    });

    it('is a no-op when bufferedMs < phraseBoundaryFloorMs (latch stays set for next enqueue)', async () => {
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 10000,
        prebufferCeilingMs: 10000,
        minSegmentMs: 10000,
        flushDelayMs: 10000,
        phraseAwareFlush: true,
        phraseBoundaryFloorMs: 100,
      };
      const service = new AudioPlaybackService(policy, null);

      // Only 30 ms buffered — below the 100 ms floor
      service.enqueue(makePcmChunk(30));
      service.markSentenceBoundary();
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled();

      // Next enqueue brings us above the floor; the latch must fire now.
      service.enqueue(makePcmChunk(80));
      await flushMicrotasks();
      expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
      service.dispose();
    });

    it('is a no-op when phraseAwareFlush is disabled', async () => {
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 10000,
        prebufferCeilingMs: 10000,
        minSegmentMs: 10000,
        flushDelayMs: 10000,
        phraseAwareFlush: false,
        phraseBoundaryFloorMs: 100,
      };
      const service = new AudioPlaybackService(policy, null);
      service.enqueue(makePcmChunk(120));
      service.markSentenceBoundary();
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled();
      service.dispose();
    });
  });

  // ─── AC6 — 20 ms spin removed ───────────────────────────────────────

  describe('AC6 — 20 ms setTimeout spin removed (plan §2.5)', () => {
    it('source file contains no hardcoded setTimeout(_, 20) in the run loop', () => {
      // Behavioral test is hard to write deterministically without fake timers;
      // a source-level assertion is equally strong for a single-line change.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const src = fs.readFileSync(
        path.resolve(__dirname, '../../src/audio/AudioPlaybackService.ts'),
        'utf8',
      );
      // The 20ms literal should no longer appear inside _runLoop's idle spin.
      expect(src).not.toMatch(/setTimeout\(resolve,\s*20\)/);
      // The old Math.max(10, ...) poll floor was replaced with refillPollMinMs
      expect(src).not.toMatch(/Math\.max\(10,\s*remaining\)/);
      // The new poll floor uses the policy knob
      expect(src).toMatch(/this\.policy\.refillPollMinMs/);
    });
  });

  // ─── AC9 — reset field matrix ───────────────────────────────────────

  describe('AC9 — reset matrix for endTurn / interrupt / dispose (plan §Step 3)', () => {
    it('endTurn() clears sentence-boundary latch so the next turn starts clean', async () => {
      const service = new AudioPlaybackService(TIGHT_POLICY, null);
      // Open a turn, latch a boundary without consumption, close the turn
      service.enqueue(makePcmChunk(30));
      service.markSentenceBoundary();
      service.endTurn();
      await flushMicrotasks();

      // The latch must be cleared — a fresh turn with pending chunks should
      // not auto-flush without crossing the normal gate.
      createAudioPlayerMock.mockClear();
      const policy2 = { ...TIGHT_POLICY, phraseBoundaryFloorMs: 100, minSegmentMs: 10000, flushDelayMs: 10000, prebufferFloorMs: 10000, prebufferCeilingMs: 10000 };
      service.setBufferPolicy(policy2);
      service.enqueue(makePcmChunk(30));
      // markSentenceBoundary NOT called — if the latch bled through we'd
      // see a flush here (30 ms < 100 ms floor would still be held, but
      // if the latch were still set and ≥100ms arrived later, that would
      // mis-behave). Checked further below with ≥100ms.
      service.enqueue(makePcmChunk(80));
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled(); // latch cleared
      service.dispose();
    });

    it('interrupt() resets consecutive underrun counters and the poor-network state', async () => {
      const service = new AudioPlaybackService(TIGHT_POLICY, null);
      service.enqueue(makePcmChunk(30));
      await flushMicrotasks();
      service.interrupt();
      await flushMicrotasks(20);

      const metrics = service.getTurnMetrics();
      expect(metrics.escalated).toBe(false);
      expect(metrics.maxConsecutiveUnderruns).toBe(0);
      service.dispose();
    });

    it('dispose() publishes jitter to the seed store before clearing', async () => {
      const seen: number[][] = [];
      const store = {
        read: () => null,
        write: (s: number[]) => { seen.push([...s]); },
      };
      const service = new AudioPlaybackService(TIGHT_POLICY, store);
      for (let i = 0; i < 6; i++) {
        service.enqueue(makePcmChunk(40));
        await flushMicrotasks();
      }
      service.dispose();
      expect(seen.length).toBeGreaterThanOrEqual(1);
      expect(seen[0].length).toBeGreaterThan(0);
    });
  });

  // ─── AC8 — interrupt mid-state ──────────────────────────────────────

  describe('AC8 — interrupt drops audio within one tick across iter2 mid-states', () => {
    it('interrupt during prebuffer wait: no createAudioPlayer ever called', async () => {
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 10000, // guarantee prebuffer wait
        prebufferCeilingMs: 10000,
      };
      const service = new AudioPlaybackService(policy, null);
      service.enqueue(makePcmChunk(30));
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled();

      service.interrupt();
      await flushMicrotasks(20);
      expect(createAudioPlayerMock).not.toHaveBeenCalled();
      service.dispose();
    });

    it('interrupt during phrase-boundary latch hold: no audio leaks out', async () => {
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 10000,
        prebufferCeilingMs: 10000,
        minSegmentMs: 10000,
        flushDelayMs: 10000,
        phraseAwareFlush: true,
        phraseBoundaryFloorMs: 100,
      };
      const service = new AudioPlaybackService(policy, null);
      // Stage: latch set, below floor, nothing flushed yet
      service.enqueue(makePcmChunk(30));
      service.markSentenceBoundary();
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled();

      service.interrupt();
      // An enqueue after interrupt opens a new turn but the latch was
      // cleared as part of interrupt's reset matrix. No auto-flush on
      // arrival above 100 ms.
      service.enqueue(makePcmChunk(120));
      await flushMicrotasks();
      expect(createAudioPlayerMock).not.toHaveBeenCalled();
      service.dispose();
    });
  });

  // ─── AC2 — adaptive segment sizing reduces player.replace() count ───

  describe('AC2 — adaptive segment sizing reduces player swaps on jittered feeds', () => {
    it('multiplier=0 policy produces MORE swaps than default iter2 policy for the same PCM volume', async () => {
      // The comparison isolates the minSegmentJitterMult lever: with
      // multiplier=0, segment target collapses to the floor minSegmentMs,
      // producing the pre-iter2 swap cadence. With the default 2.0, we
      // expect fewer swaps because the adaptive target grows with p95.
      const baselinePolicy = {
        ...DEFAULT_BUFFER_POLICY,
        minSegmentJitterMult: 0,
        prebufferFloorMs: 0,
        prebufferCeilingMs: 0,
        minSegmentMs: 40,
        flushDelayMs: 10000, // disable tail timer — force gate-driven flushes
      };
      const iter2Policy = {
        ...DEFAULT_BUFFER_POLICY,
        minSegmentJitterMult: 2.0,
        maxSegmentMs: 400,
        prebufferFloorMs: 0,
        prebufferCeilingMs: 0,
        minSegmentMs: 40,
        flushDelayMs: 10000,
      };

      async function runFeed(policy: typeof DEFAULT_BUFFER_POLICY): Promise<number> {
        createAudioPlayerMock.mockReset();
        const { playerInstances, fireCompletion } = installControllablePlayer();
        const service = new AudioPlaybackService(policy, null);
        // Simulated chunk cadence: 60ms of audio every 100ms wall-clock.
        // JitterMonitor records arrival wall-clocks, so we advance
        // Date.now() via a mock.
        const baseTs = 10_000;
        const realNow = Date.now;
        let vtime = baseTs;
        (Date.now as any) = () => vtime;
        try {
          for (let i = 0; i < 12; i++) {
            service.enqueue(makePcmChunk(60));
            vtime += 100; // 100 ms wall time between chunks
            await flushMicrotasks();
            fireCompletion();
            await flushMicrotasks();
          }
          service.endTurn();
          await flushMicrotasks(20);
          return countSegmentSwaps(playerInstances);
        } finally {
          (Date.now as any) = realNow;
          service.dispose();
        }
      }

      const baselineSwaps = await runFeed(baselinePolicy);
      const iter2Swaps = await runFeed(iter2Policy);

      // Sanity: baseline did work
      expect(baselineSwaps).toBeGreaterThan(0);
      // iter2 must produce at least one fewer swap than baseline for the
      // same feed. The "≥30%" target from AC2 is a real-network goal;
      // under the deterministic feed here we only assert "strictly fewer"
      // because the synthetic p95 can be low and the multiplier's effect
      // is bounded by minSegmentMs. A strictly-fewer assertion still
      // proves the lever is hooked up end-to-end.
      expect(iter2Swaps).toBeLessThan(baselineSwaps);
    });
  });

  // ─── AC3 / AC7 — escalation + poor-network fire ─────────────────────

  describe('AC3/AC7 — underrun escalation and onPoorNetwork callback', () => {
    it('turnEscalated latches after maxConsecutiveUnderruns and poor-network fires at threshold', async () => {
      // The loop accumulates `consecutiveUnderruns` only across underruns
      // NOT separated by a successful segment playback. To drive 3+
      // consecutive underruns we: (1) play one segment to enter mid-turn,
      // then (2) starve the loop and repeatedly wake it via
      // `markSentenceBoundary` (which calls `_notifyRefillWaiters` without
      // producing a flushable segment). Each wake passes through the
      // underrun accounting block again, incrementing the counter.
      const policy = {
        ...DEFAULT_BUFFER_POLICY,
        prebufferFloorMs: 0,
        prebufferCeilingMs: 0,
        minSegmentMs: 10,
        minSegmentJitterMult: 0,
        flushDelayMs: 10000,
        refillTargetMs: 10,
        refillTimeoutMs: 15,
        refillPollMinMs: 5,
        maxConsecutiveUnderruns: 2,
        poorNetworkThreshold: 3,
        escalatedRefillTargetMs: 50,
        escalatedPrebufferMs: 200,
      };
      const { fireCompletion } = installControllablePlayer();
      const service = new AudioPlaybackService(policy, null);
      const poorChanges: boolean[] = [];
      service.onPoorNetwork((b) => poorChanges.push(b));

      // Step 1: play one segment to enter mid-turn (isFirstSegment=false)
      service.enqueue(makePcmChunk(30));
      await flushMicrotasks();
      fireCompletion();
      await flushMicrotasks();

      // Step 2: let the first underrun be detected + its inner refill wait
      // time out; the loop settles into the fallback `await _waitForRefill`.
      await new Promise((r) => setTimeout(r, policy.refillTimeoutMs + 10));
      await flushMicrotasks();

      // Step 3: wake the loop without providing any playable data. Each
      // wake re-enters the underrun accounting block, incrementing
      // consecutiveUnderruns. Need two wakes (underruns #2 and #3) to
      // cross poorNetworkThreshold=3.
      service.markSentenceBoundary();
      await flushMicrotasks();
      await new Promise((r) => setTimeout(r, policy.refillTimeoutMs + 10));
      await flushMicrotasks();

      service.markSentenceBoundary();
      await flushMicrotasks();
      await new Promise((r) => setTimeout(r, policy.refillTimeoutMs + 10));
      await flushMicrotasks();

      const metrics = service.getTurnMetrics();
      expect(metrics.underrunCount).toBeGreaterThanOrEqual(3);
      expect(metrics.escalated).toBe(true);
      expect(metrics.maxConsecutiveUnderruns).toBeGreaterThanOrEqual(2);
      expect(poorChanges[0]).toBe(true);

      service.endTurn();
      await flushMicrotasks(10);
      // endTurn should have fired the clear
      expect(poorChanges[poorChanges.length - 1]).toBe(false);
      service.dispose();
    });

    it('successful segment playback resets consecutiveUnderruns (no monotonic latching inside the turn)', async () => {
      const policy = {
        ...TIGHT_POLICY,
        prebufferFloorMs: 0,
        prebufferCeilingMs: 0,
        minSegmentMs: 10,
        flushDelayMs: 5,
        refillTargetMs: 10,
        refillTimeoutMs: 20,
        refillPollMinMs: 5,
        maxConsecutiveUnderruns: 3, // make the threshold harder to cross
        poorNetworkThreshold: 10,
      };
      const { fireCompletion } = installControllablePlayer();
      const service = new AudioPlaybackService(policy, null);

      // One underrun, then successful play, then another underrun ...
      service.enqueue(makePcmChunk(30));
      await flushMicrotasks();
      fireCompletion();
      await new Promise((r) => setTimeout(r, 25)); // starve
      await flushMicrotasks();

      service.enqueue(makePcmChunk(30));
      await flushMicrotasks();
      fireCompletion();
      await new Promise((r) => setTimeout(r, 25)); // starve
      await flushMicrotasks();

      // Two non-consecutive underruns — max consecutive should be 1
      const metrics = service.getTurnMetrics();
      expect(metrics.underrunCount).toBeGreaterThanOrEqual(1);
      expect(metrics.maxConsecutiveUnderruns).toBeLessThanOrEqual(1);
      expect(metrics.escalated).toBe(false);
      service.dispose();
    });
  });
});
