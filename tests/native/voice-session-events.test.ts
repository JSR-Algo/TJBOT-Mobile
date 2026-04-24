/**
 * Locks the shape of the native→JS voice event discriminated union.
 *
 * The `assertExhaustive(never)` switch default is the real check: adding
 * a new variant to `VoiceTelemetryEvent` without updating the routing
 * function makes this file fail to compile, catching schema drift at
 * typecheck time (plan §4 AC-12).
 */
import type {
  VoiceTelemetryEvent,
  VoiceRouteChangeEvent,
  VoiceSessionStateChangeEvent,
  VoiceSessionRecoveredEvent,
  VoiceMicStalledEvent,
  VoicePlaybackStalledEvent,
  VoicePlaybackDrainedEvent,
} from '../../src/native/voice-session-events';
import { VOICE_EVENT_NAMES } from '../../src/native/voice-session-events';

function assertExhaustive(_v: never): never {
  throw new Error('non-exhaustive switch');
}

function routeEvent(e: VoiceTelemetryEvent): string {
  switch (e.event) {
    case 'voiceSessionStateChange':
      return `session:${e.state}:${e.route}`;
    case 'voiceRouteChange':
      return `route:${e.route}:${e.deviceId}`;
    case 'voiceSessionRecovered':
      return `session_recovered:${e.reason}`;
    case 'voiceMicStalled':
      return `mic_stalled:${e.fatal}:${e.lastFrameAgeMs}`;
    case 'voicePlaybackStalled':
      return `playback_stalled:${e.bufferedMs}:${e.framesSinceLastAdvance}`;
    case 'voicePlaybackDrained':
      return `playback_drained:${e.turnGeneration}:${e.framesPlayed}/${e.framesScheduled}:${e.reason}`;
    default:
      return assertExhaustive(e);
  }
}

describe('VoiceTelemetryEvent discriminated union', () => {
  it('routes voiceSessionStateChange', () => {
    const e: VoiceSessionStateChangeEvent = {
      event: 'voiceSessionStateChange',
      state: 'active',
      reason: 'start',
      route: 'speaker',
    };
    expect(routeEvent(e)).toBe('session:active:speaker');
  });

  it('routes voiceRouteChange', () => {
    const e: VoiceRouteChangeEvent = {
      event: 'voiceRouteChange',
      route: 'bluetooth',
      deviceId: 42,
      deviceName: 'AirPods Pro',
    };
    expect(routeEvent(e)).toBe('route:bluetooth:42');
  });

  it('routes voiceMicStalled', () => {
    const e: VoiceMicStalledEvent = {
      event: 'voiceMicStalled',
      lastFrameAgeMs: 2100,
      fatal: false,
    };
    expect(routeEvent(e)).toBe('mic_stalled:false:2100');
  });

  it('routes voicePlaybackStalled', () => {
    const e: VoicePlaybackStalledEvent = {
      event: 'voicePlaybackStalled',
      bufferedMs: 800,
      framesSinceLastAdvance: 24,
    };
    expect(routeEvent(e)).toBe('playback_stalled:800:24');
  });

  it('routes voicePlaybackDrained', () => {
    const e: VoicePlaybackDrainedEvent = {
      event: 'voicePlaybackDrained',
      turnGeneration: 7,
      framesPlayed: 48_000,
      framesScheduled: 48_000,
      reason: 'sentinel',
    };
    expect(routeEvent(e)).toBe('playback_drained:7:48000/48000:sentinel');
  });

  it('routes voiceSessionRecovered', () => {
    const e: VoiceSessionRecoveredEvent = {
      event: 'voiceSessionRecovered',
      reason: 'mediaServicesReset',
    };
    expect(routeEvent(e)).toBe('session_recovered:mediaServicesReset');
  });
});

describe('VOICE_EVENT_NAMES', () => {
  it('exposes stable native event names', () => {
    expect(VOICE_EVENT_NAMES.sessionStateChange).toBe('voiceSessionStateChange');
    expect(VOICE_EVENT_NAMES.routeChange).toBe('voiceRouteChange');
    expect(VOICE_EVENT_NAMES.sessionRecovered).toBe('voiceSessionRecovered');
    expect(VOICE_EVENT_NAMES.micStalled).toBe('voiceMicStalled');
    expect(VOICE_EVENT_NAMES.playbackStalled).toBe('voicePlaybackStalled');
    expect(VOICE_EVENT_NAMES.playbackDrained).toBe('voicePlaybackDrained');
  });
});
