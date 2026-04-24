/**
 * voiceDebugProbe — periodic diagnostics sampler for the iOS mic-auto-off
 * investigation. DEV-only. Polls VoiceMic.getDiagnostics() +
 * VoiceSession.getDiagnostics() every `intervalMs` and emits a single
 * structured line with the fields needed to discriminate hypotheses A–E
 * from `docs/qa/ad-hoc/2026-04-23-ios-voice-production-fix.md`:
 *
 *  A — LiveAudioStream silent-stop:   framesDelivered stuck after audio_capture_started
 *  B — reapplyCategory race:          sampleRate / ioBufferDuration shift mid-session
 *  C — interruption.began:            category flip / route change visible as event
 *  D — native start() silent failure: running=false / engineRunning=false after start
 *  E — voiceProcessingIO bug:         voiceProcessingEnabled + playback silent
 *
 * Not a production telemetry surface — `voice-telemetry.ts` is the right
 * home for Sentry breadcrumbs. This probe is a deliberately high-volume,
 * human-readable console dump meant for Console.app / adb logcat during
 * on-device repro sessions only.
 */
import { VoiceMic } from '../native/VoiceMic';
import { VoiceSession } from '../native/VoiceSession';

const TAG = '[voice-debug-probe]';

let timer: ReturnType<typeof setInterval> | null = null;
let tickCount = 0;

export interface VoiceDebugProbeOptions {
  intervalMs?: number;
}

/**
 * Start polling diagnostics. Idempotent — a second call while a probe is
 * already running is a no-op (the first timer keeps firing).
 */
export function startVoiceDebugProbe(opts: VoiceDebugProbeOptions = {}): void {
  if (timer !== null) return;
  const intervalMs = opts.intervalMs ?? 3000;
  tickCount = 0;
  timer = setInterval(() => {
    tickCount += 1;
    void sampleOnce(tickCount);
  }, intervalMs);
  // Fire one sample immediately so we get a snapshot at t≈0 without waiting
  // the full interval — useful to confirm the first audio_capture_started
  // actually produced running=true state.
  void sampleOnce(0);
}

export function stopVoiceDebugProbe(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

async function sampleOnce(tick: number): Promise<void> {
  const [mic, session] = await Promise.all([
    VoiceMic.getDiagnostics().catch(() => null),
    VoiceSession.getDiagnostics().catch(() => null),
  ]);

  const row = {
    tick,
    ts: new Date().toISOString(),
    mic: mic
      ? {
          running: mic.running,
          sampleRate: mic.sampleRate,
          framesDelivered: mic.framesDelivered,
          lastFrameAgeMs: mic.lastFrameAgeMs,
          engineRunning: mic.engineRunning,
          voiceProcessingEnabled: mic.voiceProcessingEnabled,
          aecMode: mic.aecMode,
        }
      : 'unavailable',
    session: session
      ? {
          active: session.sessionActive,
          category: session.category,
          mode: session.mode,
          sampleRate: session.sampleRate,
          ioBufferDuration: session.ioBufferDuration,
          inputLatency: session.inputLatency,
          outputLatency: session.outputLatency,
          route: session.route,
          isOtherAudioPlaying: session.isOtherAudioPlaying,
        }
      : 'unavailable',
  };

  // Single-line JSON so Console.app + `pbpaste | jq` stays clean. Prefix
  // makes it trivially filterable with `log stream --predicate 'eventMessage
  // CONTAINS "voice-debug-probe"'`.
  // eslint-disable-next-line no-console
  console.info(TAG, JSON.stringify(row));
}
