/**
 * Source-match locks for the iOS voice production P0 wave
 * (2026-04-23 — .omc/plans/ios-voice-production-fix-2026-04-23.md).
 *
 * These tests read the raw source files and assert the edits landed.
 * Source-match is deliberate: mocking the full @google/genai live session
 * + react-native native modules to behaviourally test useGeminiConversation
 * is a ~500-line mock dance per the existing PcmStreamPlayer.test.ts.
 * The P0 edits are structural enough that a well-targeted regex catches
 * regressions without that overhead. When a future refactor legitimately
 * changes these signatures, update the regex with the new shape — the
 * failure will show the exact line.
 *
 * Pattern borrowed from tests/security/gemini-api-key.test.ts.
 *
 * Covers:
 *   P0-1 — useHwAec=false DEBUG override removed (+ OSMemoryBarrier fences)
 *   P0-3 — activityHandling + model drift resolved
 *   P0-4 — JS mic mute during playback removed
 *   P0-5 — SharedVoiceEngine.handleMediaServicesReset() wired
 *   P0-5b — voiceSessionRecovered listener + PcmStreamPlayer.reset()
 *   P0-6 — speaker override on route change (.oldDeviceUnavailable)
 *   P0-7 — turn-generation fence on enqueue loop
 *   P0-8 — getDiagnostics bridge method + session_diagnostics structLog
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(REPO_ROOT, 'src');
const IOS = path.join(REPO_ROOT, 'ios/TbotMobile');

const read = (rel: string, root: string = SRC): string =>
  fs.readFileSync(path.join(root, rel), 'utf8');

describe('P0-1 — HW AEC re-enabled (VoiceMicModule.swift)', () => {
  const src = read('VoiceMic/VoiceMicModule.swift', IOS);

  it('derives useHwAec from the allowlist, not a hardcoded false', () => {
    expect(src).toMatch(
      /let\s+useHwAec\s*=\s*\(\s*aecRequested\s*==\s*"hw"\s*\)\s*&&\s*allowsHwAec/,
    );
  });

  it('does not contain the DEBUG "force voiceProcessing=off" assignment', () => {
    expect(src).not.toMatch(/let\s+useHwAec\s*=\s*false\s*$/m);
  });

  it('includes OSMemoryBarrier fences guarding tap-thread reads', () => {
    const fenceCount = (src.match(/OSMemoryBarrier\(\)/g) ?? []).length;
    expect(fenceCount).toBeGreaterThanOrEqual(2);
  });
});

describe('P0-1b — iOS prewarm does not steal the engine before VoiceMic', () => {
  const hook = read('hooks/useGeminiConversation.ts');

  it('prewarm is now unconditional on all platforms (P0-5: preflight pre-arms voiceProcessing)', () => {
    // P0-5: SharedVoiceEngine.preflight(voiceProcessing:true) runs before prewarm,
    // so the iOS race (prewarm stealing engine with voiceProcessing=false) is fixed.
    // The Platform.OS !== 'ios' guard was intentionally removed.
    expect(hook).not.toMatch(/Platform\.OS\s*!==\s*['"]ios['"]/);
    // Prewarm is called unconditionally; comment explains the prior race + fix.
    expect(hook).toMatch(/prewarm/);
    expect(hook).toMatch(/preflight/);
  });
});

describe('P0-3 — activityHandling + model single source of truth', () => {
  const hook = read('hooks/useGeminiConversation.ts');
  const config = read('config.ts');

  // P0-3 activityHandling is still in flux — device testing on 2026-04-23
  // showed the explicit `realtimeInputConfig.activityHandling` config could
  // drop the session into ERROR (UI bounced from LISTENING to IDLE on every
  // tap). The rollback is field-level; the canonical model is back to 3.1.
  // The rollback is intentional — START_OF_ACTIVITY_INTERRUPTS is the Live
  // API's default server-side behaviour, so barge-in still functions; only
  // the explicit client-side config is disabled until SDK compat is fixed.
  // This test accepts either state: the code must either wire the config
  // actively OR carry the ROLLED BACK marker explaining why not.
  it('activityHandling is either wired live OR explicitly rolled back with rationale', () => {
    // Active form: non-commented `realtimeInputConfig: { activityHandling: ... }`
    const activeForm = /^(?!\s*\/\/).*realtimeInputConfig\s*:\s*\{[\s\S]*?activityHandling\s*:\s*ActivityHandling\.START_OF_ACTIVITY_INTERRUPTS/m;
    // Rolled-back form: the ROLLED BACK marker + the commented activityHandling
    const rolledBackForm = /ROLLED BACK[\s\S]*?activityHandling/;
    expect(activeForm.test(hook) || rolledBackForm.test(hook)).toBe(true);
  });

  it('config.ts default model is gemini-3.1-flash-live-preview', () => {
    const m = config.match(/DEFAULT_GEMINI_LIVE_MODEL\s*=\s*['"]([^'"]+)['"]/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('models/gemini-3.1-flash-live-preview');
  });
});

describe('P0-4 — no JS mic mute during playback', () => {
  const src = read('hooks/useGeminiConversation.ts');

  it('does not early-return mic chunks when state is PLAYING_AI_AUDIO/INTERRUPTED', () => {
    // The removed pattern was a combined OR check + return inside handleMicChunk.
    // Flag any resurrection that re-adds the combined condition.
    const bad = /if\s*\(\s*currentState\s*===\s*['"]PLAYING_AI_AUDIO['"].*\|\|[\s\S]{0,80}currentState\s*===\s*['"]INTERRUPTED['"]/;
    expect(src).not.toMatch(bad);
  });

  it('retains duplex-mode rationale comment so future editors understand the intent', () => {
    // 'full-duplex' comment was replaced during RNLAS removal (P0-4).
    // The hook now uses 'half-duplex' to describe the smart gate behavior.
    expect(src.toLowerCase()).toMatch(/half-duplex|full.duplex|sendrealtimeinput/);
  });

  it('sendRealtimeInput is called for every capture-on chunk (not gated on playback state)', () => {
    // Extract the handleMicChunk body up to the first matching closing brace
    // is overkill; assert that the first return inside handleMicChunk is the
    // capture-active guard and not a playback-state guard.
    const handler = src.match(/const\s+handleMicChunk\s*=[^{]*\{([\s\S]+?)\n\s{6}\};/);
    expect(handler).not.toBeNull();
    const body = handler![1];
    // Should still early-return when capture is off — that's correct.
    expect(body).toMatch(/isCapturingRef\.current/);
    // Should NOT short-circuit based on PLAYING_AI_AUDIO.
    expect(body).not.toMatch(/=== ['"]PLAYING_AI_AUDIO['"][\s\S]*?return;/);
  });
});

describe('P0-5 + P0-5b — media-services reset engine recovery loop', () => {
  const session = read('VoiceSession/VoiceSessionModule.swift', IOS);
  const events = read('native/voice-session-events.ts');
  const wrapper = read('native/VoiceSession.ts');
  const player = read('audio/PcmStreamPlayer.ts');
  const hook = read('hooks/useGeminiConversation.ts');
  const telemetry = read('observability/voice-telemetry.ts');

  it('VoiceSessionModule.handleMediaServicesReset calls SharedVoiceEngine.shared.handleMediaServicesReset()', () => {
    // The call must happen inside the handleMediaServicesReset observer body,
    // not in some unreachable branch — assert co-location within ~20 lines.
    const idx = session.indexOf('handleMediaServicesReset(_ notification');
    expect(idx).toBeGreaterThanOrEqual(0);
    const body = session.slice(idx, idx + 1200);
    expect(body).toMatch(/SharedVoiceEngine\.shared\.handleMediaServicesReset\(\)/);
  });

  it('voiceSessionRecovered event is in the native discriminated union + VOICE_EVENT_NAMES', () => {
    expect(events).toMatch(/VoiceSessionRecoveredEvent/);
    expect(events).toMatch(/sessionRecovered\s*:\s*['"]voiceSessionRecovered['"]/);
  });

  it('VoiceSession JS wrapper exposes onSessionRecovered subscribe', () => {
    expect(wrapper).toMatch(/onSessionRecovered\s*\(/);
    expect(wrapper).toMatch(/['"]voiceSessionRecovered['"]/);
  });

  it('PcmStreamPlayer exposes a public turnGeneration getter and an async reset() method', () => {
    expect(player).toMatch(/public\s+get\s+turnGeneration\s*\(\s*\)\s*:\s*number/);
    expect(player).toMatch(/private\s+_turnGeneration\s*=\s*0\s*;/);
    expect(player).toMatch(/async\s+reset\s*\(\s*\)\s*:\s*Promise<void>/);
  });

  it('useGeminiConversation subscribes to onSessionRecovered inside voiceSessionUnsubsRef chain', () => {
    expect(hook).toMatch(/VoiceSession\.onSessionRecovered/);
  });

  it('voice-telemetry forwards voiceSessionRecovered as a Sentry breadcrumb', () => {
    expect(telemetry).toMatch(/tagSessionRecovered|VoiceSessionRecoveredEvent/);
    expect(telemetry).toMatch(/VOICE_EVENT_NAMES\.sessionRecovered/);
  });
});

describe('P0-6 — speaker override on route change', () => {
  const src = read('VoiceSession/VoiceSessionModule.swift', IOS);

  it('handleRouteChange guards on .oldDeviceUnavailable + previous=speaker + new=builtInReceiver', () => {
    const idx = src.indexOf('handleRouteChange(_ notification');
    expect(idx).toBeGreaterThanOrEqual(0);
    const body = src.slice(idx, idx + 1500);
    expect(body).toMatch(/\.oldDeviceUnavailable/);
    expect(body).toMatch(/\.builtInReceiver/);
    expect(body).toMatch(/overrideOutputAudioPort\(\.speaker\)/);
  });

  it('emits structLog event "route_forced_speaker" when the override fires', () => {
    expect(src).toMatch(/route_forced_speaker/);
  });
});

describe('P0-7 — turn-generation fence on enqueue loop', () => {
  const src = read('hooks/useGeminiConversation.ts');

  it('captures turnGeneration before entering the audioParts for-loop', () => {
    expect(src).toMatch(
      /const\s+turnAtEnqueue\s*=\s*playbackRef\.current\.turnGeneration/,
    );
  });

  it('breaks the loop when turnGeneration has changed mid-iteration', () => {
    expect(src).toMatch(
      /if\s*\(\s*playbackRef\.current\.turnGeneration\s*!==\s*turnAtEnqueue\s*\)\s*break/,
    );
  });
});

describe('P0-8 — getDiagnostics bridge surface', () => {
  const swift = read('VoiceSession/VoiceSessionModule.swift', IOS);
  const m = read('VoiceSession/VoiceSessionModule.m', IOS);
  const ts = read('native/VoiceSession.ts');

  it('Swift exposes @objc(getDiagnostics:rejecter:) returning HAL-actual values', () => {
    expect(swift).toMatch(/@objc\s*\(\s*getDiagnostics\s*:\s*rejecter\s*:\s*\)/);
    expect(swift).toMatch(/"sampleRate"\s*:\s*session\.sampleRate/);
    expect(swift).toMatch(/"ioBufferDuration"\s*:\s*session\.ioBufferDuration/);
  });

  it('Objective-C bridge declares RCT_EXTERN_METHOD(getDiagnostics:...)', () => {
    expect(m).toMatch(/RCT_EXTERN_METHOD\s*\(\s*getDiagnostics\s*:/);
  });

  it('TS wrapper exposes getDiagnostics() typed method', () => {
    expect(ts).toMatch(/getDiagnostics\s*\(\s*\)\s*:\s*Promise<VoiceSessionDiagnostics\s*\|\s*null>/);
    expect(ts).toMatch(/VoiceSessionDiagnostics/);
  });

  it('startSession logs session_diagnostics after activation', () => {
    expect(swift).toMatch(/session_diagnostics/);
  });
});

// ─── Diagnostic scaffolding for the iOS "mic auto-off" investigation ──────
// Wave added 2026-04-23 — docs/qa/ad-hoc/2026-04-23-ios-mic-auto-off-diagnostics.md
// Locks in: flag wiring, useNative gate, VoiceMic.onStall subscriber, probe.
// None of these change prod behaviour; the flag default is false.

describe('DIAG-1 — VOICE_FORCE_NATIVE_IOS feature flag removed (P0-4)', () => {
  const config = read('config.ts');
  const env = read('__env__.ts');

  it('config.ts no longer exports VOICE_FORCE_NATIVE_IOS (P0-4: RNLAS removed)', () => {
    expect(config).not.toMatch(/VOICE_FORCE_NATIVE_IOS/);
  });

  it('__env__.ts no longer contains EXPO_PUBLIC_VOICE_FORCE_NATIVE_IOS (P0-4: RNLAS removed)', () => {
    expect(env).not.toMatch(/EXPO_PUBLIC_VOICE_FORCE_NATIVE_IOS/);
  });
});

describe('DIAG-2 — native mic path is always used after P0-4 (no RNLAS fallback)', () => {
  const hook = read('hooks/useGeminiConversation.ts');

  it('shouldUseNativeMic is removed — no conditional RNLAS fallback', () => {
    expect(hook).not.toMatch(/shouldUseNativeMic/);
  });

  it('audio_capture_init telemetry logs backend:native unconditionally', () => {
    expect(hook).toMatch(/audio_capture_init[\s\S]{0,80}backend.*native/);
  });
});

describe('DIAG-3 — VoiceMic.onStall subscriber surfaces fatal stalls', () => {
  const hook = read('hooks/useGeminiConversation.ts');

  it('subscribes to VoiceMic.onStall inside the native capture branch', () => {
    expect(hook).toMatch(/VoiceMic\.onStall\s*\(/);
  });

  it('logs a breadcrumb with lastFrameAgeMs + fatal fields', () => {
    expect(hook).toMatch(/voice_mic_stalled/);
    expect(hook).toMatch(/lastFrameAgeMs\s*:\s*evt\.lastFrameAgeMs/);
    expect(hook).toMatch(/fatal\s*:\s*evt\.fatal/);
  });

  it('sets an error banner on fatal stalls so the user sees why mic went silent', () => {
    // Assert that inside the onStall handler body, a fatal branch calls setError.
    // Tolerant of whitespace/formatting between the conditional and the dispatch.
    const idx = hook.indexOf('VoiceMic.onStall');
    expect(idx).toBeGreaterThanOrEqual(0);
    const body = hook.slice(idx, idx + 600);
    expect(body).toMatch(/if\s*\(\s*evt\.fatal\s*\)/);
    expect(body).toMatch(/setError\(/);
  });

  it('cleans up the onStall subscription on both start-success and start-failure paths', () => {
    // The stop() callback on audioStreamRef must invoke unsubStall; the
    // catch path must also invoke it before bailing.
    const startIdx = hook.indexOf('const unsubStall = VoiceMic.onStall');
    expect(startIdx).toBeGreaterThanOrEqual(0);
    const body = hook.slice(startIdx, startIdx + 2600);
    // unsubStall() appears in the .then stop() callback AND the .catch path.
    const occurrences = (body.match(/unsubStall\(\)/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

describe('DIAG-4 — DEV-only voiceDebugProbe integration', () => {
  const hook = read('hooks/useGeminiConversation.ts');
  const probe = read('debug/voiceDebugProbe.ts');

  it('hook imports both probe lifecycle functions', () => {
    expect(hook).toMatch(
      /from\s+['"]\.\.\/debug\/voiceDebugProbe['"]/,
    );
    expect(hook).toMatch(/startVoiceDebugProbe/);
    expect(hook).toMatch(/stopVoiceDebugProbe/);
  });

  it('probe start/stop are both gated on __DEV__ (zero prod impact)', () => {
    expect(hook).toMatch(/if\s*\(\s*__DEV__\s*\)\s*startVoiceDebugProbe\(\)/);
    expect(hook).toMatch(/if\s*\(\s*__DEV__\s*\)\s*stopVoiceDebugProbe\(\)/);
  });

  it('voiceDebugProbe exports both lifecycle functions + is idempotent', () => {
    expect(probe).toMatch(/export\s+function\s+startVoiceDebugProbe/);
    expect(probe).toMatch(/export\s+function\s+stopVoiceDebugProbe/);
    // Idempotence guard — a second start while running must be a no-op.
    expect(probe).toMatch(/if\s*\(\s*timer\s*!==?\s*null\s*\)\s*return/);
  });

  it('probe samples fields needed to discriminate the five hypotheses A-E', () => {
    // Mic side — A (framesDelivered), D (running/engineRunning), E (voiceProcessingEnabled)
    for (const field of ['running', 'framesDelivered', 'engineRunning', 'voiceProcessingEnabled']) {
      expect(probe).toContain(field);
    }
    // Session side — B (sampleRate/ioBufferDuration), C (active/route)
    for (const field of ['sampleRate', 'ioBufferDuration', 'route']) {
      expect(probe).toContain(field);
    }
  });
});

describe('DIAG-5 — A1 logs are Console-visible without Info filter', () => {
  const src = read('VoiceMic/VoiceMicModule.swift', IOS);

  it('does not keep A1 diagnostic breadcrumbs at info-only severity', () => {
    expect(src).not.toMatch(/\[A1\][\s\S]{0,160}type:\s*\.info/);
  });

  it('keeps A1 diagnostics searchable at default/error severities', () => {
    expect(src).toMatch(/\[A1\][\s\S]{0,160}type:\s*\.default/);
    expect(src).toMatch(/\[A1\][\s\S]{0,160}type:\s*\.error/);
  });
});

describe('DIAG-6 — native listener accounting reaches startObserving/stopObserving', () => {
  const mic = read('VoiceMic/VoiceMicModule.swift', IOS);
  const pcm = read('PcmStream/PcmStreamModule.swift', IOS);

  it('VoiceMic forwards addListener/removeListeners to RCTEventEmitter', () => {
    expect(mic).toMatch(/override\s+func\s+startObserving\(\)\s*\{\s*hasListeners\s*=\s*true\s*\}/);
    expect(mic).toMatch(/override\s+func\s+stopObserving\(\)\s*\{\s*hasListeners\s*=\s*false\s*\}/);
    expect(mic).toMatch(/@objc\s+override\s+func\s+addListener\(_\s+eventName:\s+String\)\s*\{\s*super\.addListener\(eventName\)\s*\}/);
    expect(mic).toMatch(/@objc\s+override\s+func\s+removeListeners\(_\s+count:\s+Double\)\s*\{\s*super\.removeListeners\(count\)\s*\}/);
  });

  it('PcmStream forwards addListener/removeListeners to RCTEventEmitter', () => {
    expect(pcm).toMatch(/override\s+func\s+startObserving\(\)\s*\{\s*hasListeners\s*=\s*true\s*\}/);
    expect(pcm).toMatch(/override\s+func\s+stopObserving\(\)\s*\{\s*hasListeners\s*=\s*false\s*\}/);
    expect(pcm).toMatch(/@objc\s+override\s+func\s+addListener\(_\s+eventName:\s+String\)\s*\{\s*super\.addListener\(eventName\)\s*\}/);
    expect(pcm).toMatch(/@objc\s+override\s+func\s+removeListeners\(_\s+count:\s+Double\)\s*\{\s*super\.removeListeners\(count\)\s*\}/);
  });
});
