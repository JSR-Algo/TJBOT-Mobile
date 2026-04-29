/**
 * P0-13 soft reconnect — structural tests (plan v2 §7.3).
 *
 * Live-runtime testing of the reconnect path requires mocking the
 * @google/genai SDK + VoiceSession + VoiceMic + playbackRef in a
 * mounted React harness — heavy and brittle for what is fundamentally a
 * check that the goAway → softReconnect flow:
 *   1. closes WS only (does NOT call stopConversation/stopSession);
 *   2. preserves currentUserTurnId iff state was USER_SPEAKING /
 *      USER_SPEECH_FINALIZING;
 *   3. drops currentResponseId always (via openBargeInWindow);
 *   4. bumps epoch + sets bargeInWindowOpen=true;
 *   5. re-enters startConversation with isReconnect=true so native
 *      setup is skipped (capture/playback/native session stay alive).
 *
 * Strategy: read the compiled hook source and assert the structural
 * shape of each guarantee. Drift from §7.3 fails the test loudly.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

describe('P0-13 soft reconnect — startConversation gates on isReconnect', () => {
  it('admits RECONNECTING in addition to IDLE / ERROR_RECOVERABLE at the entry guard', () => {
    // Without admitting RECONNECTING, softReconnect would fall through
    // the early return and the new WS would never open.
    expect(hook).toMatch(
      /state\s*!==\s*'IDLE'\s*&&\s*state\s*!==\s*'ERROR_RECOVERABLE'\s*&&\s*state\s*!==\s*'RECONNECTING'/,
    );
  });

  it('derives isReconnect from state at entry', () => {
    expect(hook).toMatch(/const\s+isReconnect\s*=\s*state\s*===\s*'RECONNECTING'/);
  });

  it('skips simulator fallback on reconnect', () => {
    // Simulator path is initial-start-only. Reconnect gating prevents
    // a stale simulator branch from tearing down a real WS.
    expect(hook).toMatch(/!Device\.isDevice\s*&&\s*!isReconnect/);
  });

  it('skips mic permission prompt on reconnect (UX: no mid-call re-prompt)', () => {
    const idx = hook.indexOf("// 1. Request mic permission");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 800);
    // The whole block is wrapped in `if (!isReconnect) { ... }`.
    expect(slice).toMatch(/if\s*\(\s*!isReconnect\s*\)\s*\{/);
  });

  it('skips the CONNECTING transition on reconnect (FSM stays in RECONNECTING)', () => {
    // Anchor on the comment that introduces the gated block. Earlier
    // `transition('CONNECTING')` instances live in the simulator branch
    // (which is itself already gated by `!isReconnect`).
    const idx = hook.indexOf('soft reconnect stays in RECONNECTING');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 400);
    expect(slice).toMatch(/if\s*\(\s*!isReconnect\s*\)\s*\{/);
    expect(slice).toMatch(/transition\('CONNECTING'\)/);
  });

  it('skips VoiceSession.start + listener attach on reconnect', () => {
    // Native session stays running; re-attaching listeners would leak
    // subscriptions on every goAway. The actual gate uses
    // `VoiceSession.isAvailable && !isReconnect` (whitespace tolerated).
    const idx = hook.indexOf('VoiceSession.isAvailable');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 80);
    expect(slice).toMatch(/!isReconnect/);
  });

  it('skips playback callback re-wiring on reconnect (no double-handlers)', () => {
    // Each onPlaybackFinish/Start/etc call appends a listener; without
    // the gate, soft reconnects would multiply handlers on every
    // goAway. Look for the gate immediately before the first
    // playbackRef.current.onPlaybackFinish.
    const idx = hook.indexOf('playbackRef.current.onPlaybackFinish');
    expect(idx).toBeGreaterThanOrEqual(0);
    // Look BACKWARDS up to 600 chars for the gate.
    const slice = hook.slice(Math.max(0, idx - 600), idx);
    expect(slice).toMatch(/if\s*\(\s*!isReconnect\s*\)\s*\{/);
  });
});

describe('P0-13 soft reconnect — reconnectRef body (plan v2 §7.3)', () => {
  // Slice the reconnectRef.current = ... body for the rest of the
  // assertions. Anchored on the unique prefix.
  const startIdx = hook.indexOf('reconnectRef.current = () => {');
  if (startIdx < 0) throw new Error('reconnectRef body not found');
  const reconnectBody = hook.slice(startIdx, startIdx + 3000);

  it('does NOT call stopConversation (would reset all v2 identifiers)', () => {
    // P0-3 store.stopSession resets sessionId + epoch +
    // currentUserTurnId + currentResponseId + bargeInWindowOpen. The
    // whole point of soft reconnect is to NOT do that. If a future
    // edit reintroduces stopConversation here, this test fails.
    expect(reconnectBody).not.toMatch(/\bstopConversation\(\)/);
  });

  it('preserves currentUserTurnId iff state is USER_SPEAKING or USER_SPEECH_FINALIZING', () => {
    expect(reconnectBody).toMatch(/USER_SPEAKING/);
    expect(reconnectBody).toMatch(/USER_SPEECH_FINALIZING/);
    // The non-mid-utterance branch nulls the turn id.
    expect(reconnectBody).toMatch(/currentUserTurnId:\s*null/);
  });

  it('calls openBargeInWindow to bump epoch + null responseId atomically', () => {
    // openBargeInWindow is the single chokepoint per §8.5. It sets
    // bargeInWindowOpen=true, currentResponseId=null, epoch++ in one
    // set() call.
    expect(reconnectBody).toMatch(/openBargeInWindow\(\)/);
  });

  it('closes the WS only (sessionRef.current?.close)', () => {
    // The native session, capture loop, and playback ref all stay
    // running. Only the WS handle is dropped.
    expect(reconnectBody).toMatch(/sessionRef\.current\?\.close\?\.\(\)/);
    expect(reconnectBody).toMatch(/sessionRef\.current\s*=\s*null/);
  });

  it('drains a microtask before re-entering startConversation', () => {
    // queueMicrotask lets the old WS fire its onclose / onerror first
    // (those handlers may emit telemetry that should land before the
    // new WS opens).
    expect(reconnectBody).toMatch(/queueMicrotask\(/);
  });

  it('guards on RECONNECTING (not IDLE) before re-entering startConversation', () => {
    // Old code guarded on state === 'IDLE' because stopConversation
    // left us there. Soft reconnect leaves us in RECONNECTING, so
    // the guard must check that exact state. Regression risk: a
    // future edit copy-pasting the old guard would never reconnect.
    expect(reconnectBody).toMatch(/cur\.state\s*!==\s*'RECONNECTING'/);
  });

  it('falls back to ERROR_RECOVERABLE on startConversation rejection', () => {
    expect(reconnectBody).toMatch(/transition\('ERROR_RECOVERABLE'\)/);
  });

  it('does NOT call _stopAudioCapture (capture stays running across the swap)', () => {
    expect(reconnectBody).not.toMatch(/_stopAudioCapture\(\)/);
  });

  it('does NOT call playbackRef.dispose (playback stays running)', () => {
    expect(reconnectBody).not.toMatch(/playbackRef\.current\?\.dispose/);
  });
});

describe('P0-13 soft reconnect — goAway handler still drives the path', () => {
  it('goAway handler transitions to RECONNECTING then calls reconnectRef', () => {
    const idx = hook.indexOf('message.goAway');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 1200);
    expect(slice).toMatch(/transition\('RECONNECTING'\)/);
    expect(slice).toMatch(/reconnectRef\.current\?\.\(\)/);
  });
});
