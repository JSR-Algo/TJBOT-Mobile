/**
 * P0-13 soft reconnect — structural tests (plan v2 §7.3).
 *
 * The reconnect flow was preserved when useGeminiConversation was split into
 * focused sub-hooks. The reconnect body still lives in the composer, but it
 * now closes the session through the useGeminiAudioSession `sessionApi`
 * abstraction rather than reaching into `sessionRef` directly.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

describe('P0-13 soft reconnect — startConversation gates on isReconnect', () => {
  it('admits RECONNECTING in addition to IDLE / ERROR_RECOVERABLE at the entry guard', () => {
    expect(hook).toMatch(
      /state\s*!==\s*'IDLE'\s*&&\s*state\s*!==\s*'ERROR_RECOVERABLE'\s*&&\s*state\s*!==\s*'RECONNECTING'/,
    );
  });

  it('derives isReconnect from state at entry', () => {
    expect(hook).toMatch(/const\s+isReconnect\s*=\s*state\s*===\s*'RECONNECTING'/);
  });

  it('skips simulator fallback on reconnect', () => {
    expect(hook).toMatch(/!Device\.isDevice\s*&&\s*!isReconnect/);
  });

  it('skips mic permission prompt on reconnect (UX: no mid-call re-prompt)', () => {
    const idx = hook.indexOf("// Device path");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 900);
    // The permission block is wrapped in `if (!isReconnect) { ... }`.
    expect(slice).toMatch(/if\s*\(\s*!isReconnect\s*\)\s*\{/);
    expect(slice).toMatch(/requestRecordingPermissionsAsync\(\)/);
  });

  it('skips the PREPARING_AUDIO transition on reconnect (FSM stays in RECONNECTING)', () => {
    const idx = hook.indexOf("// Device path");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 600);
    expect(slice).toMatch(/if\s*\(\s*!isReconnect\s*\)\s*\{/);
    expect(slice).toMatch(/transition\('PREPARING_AUDIO'\)/);
  });

  it('skips VoiceSession.start + listener attach on reconnect', () => {
    expect(hook).toMatch(/VoiceSession\.isAvailable\s*&&\s*!isReconnect/);
  });

  it('skips playback callback re-wiring on reconnect (no double-handlers)', () => {
    // Each onPlaybackFinish/Start/etc call appends a listener; without
    // the gate, soft reconnects would multiply handlers on every
    // goAway. Look for the gate immediately before wirePlaybackCallbacks().
    const idx = hook.indexOf('wirePlaybackCallbacks();');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(Math.max(0, idx - 300), idx);
    expect(slice).toMatch(/if\s*\(\s*!isReconnect\s*\)\s*\{/);
  });
});

describe('P0-13 soft reconnect — reconnectRef body (plan v2 §7.3)', () => {
  // Slice the reconnectRef.current = ... body for the rest of the
  // assertions. Anchored on the unique prefix and terminated before the
  // surrounding useEffect cleanup so we don't pick up stopConversation().
  const startIdx = hook.indexOf('reconnectRef.current = () => {');
  if (startIdx < 0) throw new Error('reconnectRef body not found');
  const endMatch = hook.slice(startIdx).match(/};\s*\n\s*return\s*\(\)\s*=>\s*\{/);
  if (!endMatch || endMatch.index === undefined) {
    throw new Error('reconnectRef body end not found');
  }
  const reconnectBody = hook.slice(startIdx, startIdx + endMatch.index + 2);

  it('does NOT call stopConversation (would reset all v2 identifiers)', () => {
    expect(reconnectBody).not.toMatch(/\bstopConversation\(\)/);
  });

  it('preserves currentUserTurnId iff state is USER_SPEAKING or USER_SPEECH_FINALIZING', () => {
    expect(reconnectBody).toMatch(/USER_SPEAKING/);
    expect(reconnectBody).toMatch(/USER_SPEECH_FINALIZING/);
    expect(reconnectBody).toMatch(/currentUserTurnId:\s*null/);
  });

  it('calls openBargeInWindow to bump epoch + null responseId atomically', () => {
    expect(reconnectBody).toMatch(/openBargeInWindow\(\)/);
  });

  it('closes the WS only (via sessionApi.close)', () => {
    // The native session, capture loop, and playback ref all stay
    // running. Only the WS handle is dropped through the audio-session API.
    expect(reconnectBody).toMatch(/sessionApi\.close\(\)/);
    expect(reconnectBody).not.toMatch(/sessionRef\.current\s*=\s*null/);
  });

  it('drains a microtask before re-entering startConversation', () => {
    expect(reconnectBody).toMatch(/queueMicrotask\(/);
  });

  it('guards on RECONNECTING (not IDLE) before re-entering startConversation', () => {
    expect(reconnectBody).toMatch(/store\.getState\(\)\.state\s*!==\s*'RECONNECTING'/);
  });

  it('falls back to ERROR_RECOVERABLE on startConversation rejection', () => {
    expect(reconnectBody).toMatch(/transition\('ERROR_RECOVERABLE'\)/);
  });

  it('does NOT call _stopAudioCapture (capture stays running across the swap)', () => {
    expect(reconnectBody).not.toMatch(/_stopAudioCapture\(\)/);
  });

  it('does NOT call playback.dispose (playback stays running)', () => {
    expect(reconnectBody).not.toMatch(/playback\.dispose/);
  });
});

describe('P0-13 soft reconnect — goAway handler still drives the path', () => {
  it('goAway handler transitions to RECONNECTING then calls reconnectRef', () => {
    const idx = hook.indexOf('onGoAway');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 1200);
    expect(slice).toMatch(/transition\('RECONNECTING'\)/);
    expect(slice).toMatch(/reconnectRef\.current\?\.\(\)/);
  });
});
