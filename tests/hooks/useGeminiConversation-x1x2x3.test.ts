/**
 * P0-16 X1/X2/X3 cross-platform regression smoke gate — plan v2 §13.6
 *
 * CI smoke gate: same sequence of FSM transitions and same event TYPES
 * on both platforms. Structural source assertions — no timing comparisons
 * (timing-based checks would be flaky on simulators per §13.6).
 *
 * X1: voiceMicVadStart fires → FSM transitions LISTENING → USER_SPEAKING
 * X2: voiceMicVadEnd fires → FSM transitions USER_SPEAKING → WAITING_AI
 * X3: voicePlaybackDrained fires → FSM transitions WAITING_AI → ASSISTANT_SPEAKING
 *     (or ASSISTANT_SPEAKING → stable via drain sentinel)
 *
 * These are CI-blocking, not release-authorizing. Physical-device matrix
 * (§13.8) is the release gate.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

const STORE_PATH = path.resolve(__dirname, '../../src/state/voiceAssistantStore.ts');
const store = fs.readFileSync(STORE_PATH, 'utf8');

const VOICE_MIC_PATH = path.resolve(__dirname, '../../src/native/VoiceMic.ts');
const voiceMic = fs.readFileSync(VOICE_MIC_PATH, 'utf8');

const EVENTS_PATH = path.resolve(__dirname, '../../src/native/voice-session-events.ts');
const events = fs.readFileSync(EVENTS_PATH, 'utf8');

// ─── X1: voiceMicVadStart → LISTENING → USER_SPEAKING ───────────────────

describe('X1: voiceMicVadStart drives LISTENING → USER_SPEAKING', () => {
  it('VOICE_EVENT_NAMES includes micVadStart = voiceMicVadStart', () => {
    expect(events).toMatch(/micVadStart\s*:\s*'voiceMicVadStart'/);
  });

  it('VoiceMic shim exposes onVadStart subscriber', () => {
    expect(voiceMic).toMatch(/onVadStart\s*\(cb/);
    expect(voiceMic).toMatch(/voiceMicVadStart/);
  });

  it('hook subscribes to onVadStart and transitions LISTENING → USER_SPEAKING', () => {
    // The capture-loop subscriber drives LISTENING → USER_SPEAKING on VAD start
    expect(hook).toMatch(/VoiceMic\.onVadStart/);
    // Guard: only acts in LISTENING state
    expect(hook).toMatch(/s\.state\s*===\s*'LISTENING'[\s\S]{0,200}USER_SPEAKING/);
  });

  it('store allows LISTENING → USER_SPEAKING transition', () => {
    expect(store).toMatch(/LISTENING[\s\S]{0,300}USER_SPEAKING/);
  });

  it('USER_SPEAKING mints a UserTurnId on entry via startUserTurn()', () => {
    // Plan §3.1.1: UserTurnId minted at voiceMicVadStart edge.
    // Store exposes startUserTurn() which calls set({ currentUserTurnId: id }).
    expect(store).toMatch(/startUserTurn/);
    expect(store).toMatch(/currentUserTurnId/);
    expect(store).toMatch(/set\(\s*\{\s*currentUserTurnId:\s*id\s*\}\s*\)/);
  });
});

// ─── X2: voiceMicVadEnd → USER_SPEAKING → WAITING_AI ────────────────────

describe('X2: voiceMicVadEnd drives USER_SPEAKING → WAITING_AI', () => {
  it('VoiceMic shim exposes onVadEnd subscriber', () => {
    expect(voiceMic).toMatch(/onVadEnd\s*\(cb/);
    expect(voiceMic).toMatch(/voiceMicVadEnd/);
  });

  it('hook subscribes to onVadEnd and transitions USER_SPEAKING → WAITING_AI', () => {
    expect(hook).toMatch(/VoiceMic\.onVadEnd/);
    expect(hook).toMatch(/s\.state\s*===\s*'USER_SPEAKING'[\s\S]{0,200}WAITING_AI/);
  });

  it('store allows USER_SPEAKING → WAITING_AI transition', () => {
    expect(store).toMatch(/USER_SPEAKING[\s\S]{0,300}WAITING_AI/);
  });

  it('userSpeechEndMsRef is stamped before WAITING_AI transition', () => {
    // T4.5: userSpeechEndMs stamped at VAD-end for TTFA measurement
    expect(hook).toMatch(/userSpeechEndMsRef\.current[\s\S]{0,100}WAITING_AI/);
  });
});

// ─── X3: voicePlaybackDrained → WAITING_AI/ASSISTANT_SPEAKING stable ────

describe('X3: drain sentinel drives ASSISTANT_SPEAKING → LISTENING transition', () => {
  it('VOICE_EVENT_NAMES includes playbackDrained = voicePlaybackDrained', () => {
    expect(events).toMatch(/playbackDrained\s*:\s*'voicePlaybackDrained'/);
  });

  it('hook references voiceResponseDrained / P0-11 drain path', () => {
    // Drain is delivered via PcmStreamPlayer onPlaybackFinish callback (voiceResponseDrained).
    // The hook comment at the turnComplete handler names this explicitly.
    expect(hook).toMatch(/voiceResponseDrained/);
  });

  it('drain drives ASSISTANT_SPEAKING → LISTENING with responseId guard', () => {
    // P0-11: only transition when drained turn matches currentResponseId (stale-event guard)
    expect(hook).toMatch(/ASSISTANT_SPEAKING[\s\S]{0,500}LISTENING/);
    expect(hook).toMatch(/currentResponseId/);
  });

  it('store allows WAITING_AI → ASSISTANT_SPEAKING transition', () => {
    expect(store).toMatch(/WAITING_AI[\s\S]{0,300}ASSISTANT_SPEAKING/);
  });

  it('drain event carries turnGeneration for stale-event filtering', () => {
    // Plan §13.7: stale drain events from interrupted turns are filtered by turnGeneration
    expect(events).toMatch(/turnGeneration/);
  });
});

// ─── Cross-platform contract: event names are stable strings ─────────────

describe('Cross-platform event name contract', () => {
  const expectedEventNames = [
    'voiceMicVadStart',
    'voiceMicVadEnd',
    'voicePlaybackDrained',
    'voiceMicEngineReady',
    'voiceMicStalled',
    'voicePlaybackStalled',
  ];

  it.each(expectedEventNames)(
    'event name "%s" appears in VOICE_EVENT_NAMES or VoiceMic shim',
    (name) => {
      const inEvents = events.includes(name);
      const inVoiceMic = voiceMic.includes(name);
      expect({ name, found: inEvents || inVoiceMic }).toEqual({ name, found: true });
    },
  );
});
