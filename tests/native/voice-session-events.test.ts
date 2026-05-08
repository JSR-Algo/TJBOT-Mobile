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
  VoiceMicEngineReadyEvent,
  VoiceAecAttachFailedEvent,
  VoiceMicVadStartEvent,
  VoiceMicVadEndEvent,
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
    case 'voiceMicEngineReady':
      return `mic_engine_ready:${e.firstFrameAgeMs}:${e.sampleRate}`;
    case 'voiceAecAttachFailed':
      return `aec_attach_failed:${e.reason}:${e.modelCode}:${e.deviceCode}`;
    case 'voicePlaybackStalled':
      return `playback_stalled:${e.bufferedMs}:${e.framesSinceLastAdvance}`;
    case 'voicePlaybackDrained':
      return `playback_drained:${e.turnGeneration}:${e.framesPlayed}/${e.framesScheduled}:${e.reason}`;
    case 'voiceMicVadStart':
      return 'vad_start';
    case 'voiceMicVadEnd':
      return `vad_end:${e.hangoverMs}`;
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

  it('routes voiceAecAttachFailed', () => {
    const e: VoiceAecAttachFailedEvent = {
      event: 'voiceAecAttachFailed',
      reason: 'create_returned_null',
      modelCode: 42,
      deviceCode: 'Pixel 7',
    };
    expect(routeEvent(e)).toBe('aec_attach_failed:create_returned_null:42:Pixel 7');
  });

  it('routes voiceMicEngineReady', () => {
    const e: VoiceMicEngineReadyEvent = {
      event: 'voiceMicEngineReady',
      firstFrameAgeMs: 0,
      sampleRate: 16_000,
    };
    expect(routeEvent(e)).toBe('mic_engine_ready:0:16000');
  });
});

describe('VOICE_EVENT_NAMES', () => {
  it('exposes stable native event names', () => {
    expect(VOICE_EVENT_NAMES.sessionStateChange).toBe('voiceSessionStateChange');
    expect(VOICE_EVENT_NAMES.routeChange).toBe('voiceRouteChange');
    expect(VOICE_EVENT_NAMES.sessionRecovered).toBe('voiceSessionRecovered');
    expect(VOICE_EVENT_NAMES.micStalled).toBe('voiceMicStalled');
    expect(VOICE_EVENT_NAMES.micEngineReady).toBe('voiceMicEngineReady');
    expect(VOICE_EVENT_NAMES.aecAttachFailed).toBe('voiceAecAttachFailed');
    expect(VOICE_EVENT_NAMES.playbackStalled).toBe('voicePlaybackStalled');
    expect(VOICE_EVENT_NAMES.playbackDrained).toBe('voicePlaybackDrained');
  });
});

describe('P0-7 — voiceMicVadStart / voiceMicVadEnd routing', () => {
  it('routes voiceMicVadStart', () => {
    const e: VoiceMicVadStartEvent = { event: 'voiceMicVadStart' };
    expect(routeEvent(e)).toBe('vad_start');
  });

  it('routes voiceMicVadEnd', () => {
    const e: VoiceMicVadEndEvent = { event: 'voiceMicVadEnd', hangoverMs: 400 };
    expect(routeEvent(e)).toBe('vad_end:400');
  });

  it('VOICE_EVENT_NAMES has vadStart and vadEnd', () => {
    expect(VOICE_EVENT_NAMES.vadStart).toBe('voiceMicVadStart');
    expect(VOICE_EVENT_NAMES.vadEnd).toBe('voiceMicVadEnd');
  });

  it('VoiceMic.ts declares onVadStart and onVadEnd methods', () => {
    const fs = require('fs');
    const ts = fs.readFileSync(require('path').join(__dirname, '../../src/native/VoiceMic.ts'), 'utf8');
    expect(ts).toMatch(/onVadStart/);
    expect(ts).toMatch(/onVadEnd/);
  });
});

describe('P0-15 — voiceSessionRecovered reason variants', () => {
  it('routes mediaServicesReset reason', () => {
    const e: VoiceSessionRecoveredEvent = {
      event: 'voiceSessionRecovered',
      reason: 'mediaServicesReset',
    };
    expect(routeEvent(e)).toBe('session_recovered:mediaServicesReset');
  });

  it('routes interruptionEnded reason', () => {
    const e: VoiceSessionRecoveredEvent = {
      event: 'voiceSessionRecovered',
      reason: 'interruptionEnded',
    };
    expect(routeEvent(e)).toBe('session_recovered:interruptionEnded');
  });

  it('routes foregroundResume reason', () => {
    const e: VoiceSessionRecoveredEvent = {
      event: 'voiceSessionRecovered',
      reason: 'foregroundResume',
    };
    expect(routeEvent(e)).toBe('session_recovered:foregroundResume');
  });
});

describe('P0-15 — VoiceMicDiagnostics.tapInstalled surface', () => {
  it('VoiceMic.ts declares tapInstalled: boolean in VoiceMicDiagnostics', () => {
    const fs = require('fs');
    const ts = fs.readFileSync(require('path').join(__dirname, '../../src/native/VoiceMic.ts'), 'utf8');
    expect(ts).toMatch(/tapInstalled\s*:\s*boolean/);
  });

  it('SharedVoiceEngine.swift snapshot uses tapInstalled key (not inputTapInstalled)', () => {
    const fs = require('fs');
    const swift = fs.readFileSync(
      require('path').join(__dirname, '../../ios/TbotMobile/SharedVoiceEngine.swift'),
      'utf8',
    );
    expect(swift).toMatch(/["']tapInstalled["']/);
    expect(swift).not.toMatch(/["']inputTapInstalled["']/);
  });

  it('Android VoiceMicModule.kt getDiagnostics emits tapInstalled', () => {
    const fs = require('fs');
    const kt = fs.readFileSync(
      require('path').join(
        __dirname,
        '../../android/app/src/main/java/com/tbotmobile/voicemic/VoiceMicModule.kt',
      ),
      'utf8',
    );
    expect(kt).toMatch(/putBoolean\s*\(\s*["']tapInstalled["']/);
  });
});

describe('P0-11 — drain-event drives ASSISTANT_SPEAKING → LISTENING', () => {
  it('turnComplete handler in hook does NOT use racy isPlaying poll to transition', () => {
    const fs = require('fs');
    const hook = fs.readFileSync(
      require('path').join(__dirname, '../../src/hooks/useGeminiConversation.ts'),
      'utf8',
    );
    // The old racy pattern must be gone: isPlaying check + transition in turnComplete block
    expect(hook).not.toMatch(/isPlaying[\s\S]{0,60}transition\(['"]LISTENING['"]\)/);
  });

  it('turnComplete handler stamps responseTurnCompleteAtMsRef and calls endTurn()', () => {
    const fs = require('fs');
    const hook = fs.readFileSync(
      require('path').join(__dirname, '../../src/hooks/useGeminiConversation.ts'),
      'utf8',
    );
    expect(hook).toMatch(/responseTurnCompleteAtMsRef\.current\s*=\s*Date\.now\(\)/);
    expect(hook).toMatch(/turnComplete[\s\S]{0,400}endTurn\(\)/);
  });

  it('silent-server-response: hook transitions WAITING_AI → LISTENING on turnComplete', () => {
    const fs = require('fs');
    const hook = fs.readFileSync(
      require('path').join(__dirname, '../../src/hooks/useGeminiConversation.ts'),
      'utf8',
    );
    expect(hook).toMatch(/state\s*===\s*['"]WAITING_AI['"]\s*\)[\s\S]{0,200}transition\(['"]LISTENING['"]\)/);
  });

  it('onPlaybackFinish is the authoritative ASSISTANT_SPEAKING → LISTENING driver', () => {
    const fs = require('fs');
    const hook = fs.readFileSync(
      require('path').join(__dirname, '../../src/hooks/useGeminiConversation.ts'),
      'utf8',
    );
    expect(hook).toMatch(/playbackRef\.current\.onPlaybackFinish[\s\S]{0,800}ASSISTANT_SPEAKING[\s\S]{0,800}transition\(['"]LISTENING['"]\)/);
  });

  it('5s drain-timeout safety useEffect exists for ASSISTANT_SPEAKING state', () => {
    const fs = require('fs');
    const hook = fs.readFileSync(
      require('path').join(__dirname, '../../src/hooks/useGeminiConversation.ts'),
      'utf8',
    );
    expect(hook).toMatch(/fsmState\s*!==\s*['"]ASSISTANT_SPEAKING['"][\s\S]{0,200}5000/);
    expect(hook).toMatch(/voice\.assistant\.drain_timeout/);
  });

  it('onPlaybackFinish clears drain-timeout anchor (responseTurnCompleteAtMsRef = null)', () => {
    const fs = require('fs');
    const hook = fs.readFileSync(
      require('path').join(__dirname, '../../src/hooks/useGeminiConversation.ts'),
      'utf8',
    );
    // Inside onPlaybackFinish, the ref must be nulled to cancel the safety net
    expect(hook).toMatch(/onPlaybackFinish[\s\S]{0,500}responseTurnCompleteAtMsRef\.current\s*=\s*null/);
  });
});
