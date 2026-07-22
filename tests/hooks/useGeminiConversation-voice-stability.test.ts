import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

function sliceFrom(anchor: string, length: number): string {
  const idx = hook.indexOf(anchor);
  if (idx < 0) throw new Error(`Missing anchor: ${anchor}`);
  return hook.slice(idx, idx + length);
}

describe('useGeminiConversation voice stability source locks', () => {
  it('speak-first: mic permission is requested in parallel and never dead-ends the session', () => {
    const permissionBlock = sliceFrom('mic_permission_requested', 2600);

    expect(permissionBlock).toMatch(/requestRecordingPermissionsAsync\(\)/);
    // Non-blocking: resolved via .then, never awaited before the connect.
    expect(permissionBlock).toMatch(/\.then\(\(\{\s*granted\s*\}\)\s*=>/);
    expect(permissionBlock).toMatch(/micGrantedRef\.current = granted/);
    // Deny keeps the robot speaking: a parent-facing notice, no FSM error.
    expect(permissionBlock).toMatch(/if\s*\(!granted\)\s*\{/);
    expect(permissionBlock).toMatch(/TeeBot vẫn nói được/);
    expect(permissionBlock).not.toMatch(/transition\('ERROR_RECOVERABLE'\)/);
    // Stale-run guard: a permission promise from a superseded run returns
    // BEFORE writing micGrantedRef, so it can never flip the live run's mic
    // state and strand a later capture restart.
    expect(permissionBlock).toMatch(/voiceRunIdRef\.current !== permissionRunId\)\s*return/);
    // Banner effects still fire only for the run that asked.
    expect(permissionBlock).toMatch(/voiceRunIdRef\.current === permissionRunId/);
    // Request failure is a run-guarded notice, never a dead-end.
    expect(permissionBlock).toMatch(/\.catch\(\(err\)\s*=>/);
    expect(permissionBlock).toMatch(/jsErrorBreadcrumb\('voice\.micPermission\.request'/);
  });

  it('speak-first: reconnect refreshes mic permission without prompting (revoked → speak-only, no dead-end)', () => {
    // The parallel request runs only on a fresh start; the reconnect path
    // refreshes via the non-prompting getter so a mic revoked in Settings
    // between disconnect and reconnect degrades to speak-only rather than
    // dead-ending with E_MIC_PERMISSION_DENIED.
    expect(hook).toMatch(/getRecordingPermissionsAsync/);
    const reconnectRefresh = sliceFrom('} else if (VoiceMic.isAvailable) {', 800);
    expect(reconnectRefresh).toMatch(/getRecordingPermissionsAsync\(\)/);
    expect(reconnectRefresh).toMatch(/micGrantedRef\.current = granted/);
    expect(reconnectRefresh).not.toMatch(/transition\('ERROR_RECOVERABLE'\)/);
    expect(reconnectRefresh).toMatch(/jsErrorBreadcrumb\('voice\.micPermission\.reconnectRefresh'/);
  });

  it('speak-first: greeting kickoff fires after a fresh connect and capture is gated on grant', () => {
    // Kickoff: fresh sessions nudge Gemini to take the first turn.
    const kickoffBlock = sliceFrom('await session.connect(sessionCallbacks, isReconnect);', 600);
    expect(kickoffBlock).toMatch(/if\s*\(!isReconnect\)\s*\{/);
    expect(kickoffBlock).toMatch(/sendTextTurn\(GREETING_KICKOFF_TURN\)/);
    // Capture never starts without permission (would reject and dead-end).
    const captureBlock = sliceFrom('function _startAudioCapture(): void {', 400);
    expect(captureBlock).toMatch(/if\s*\(!micGrantedRef\.current\)\s*\{/);
    // Speak-only mode promotes READY → LISTENING so the 2s deadline can't fire.
    const connectedBlock = sliceFrom('const promoteReadyToListening', 500);
    expect(connectedBlock).toMatch(/if\s*\(!micGrantedRef\.current\)\s*\{/);
    expect(connectedBlock).toMatch(/transition\('LISTENING'\)/);
  });

  it('stopConversation cleans capture, playback, SDK session, and voice session subscriptions', () => {
    const stopBlock = sliceFrom('const stopConversation = useCallback', 1900);

    expect(stopBlock).toMatch(/voiceRunIdRef\.current \+= 1/);
    expect(stopBlock).toMatch(/micGrantedRef\.current = false/);
    expect(stopBlock).toMatch(/clearTimeout\(simulatorReplyTimerRef\.current\)/);
    expect(stopBlock).toMatch(/stopAudioCaptureRef\.current\?\.\(\)/);
    expect(stopBlock).toMatch(/playback\.interrupt\(\)/);
    expect(stopBlock).toMatch(/playback\.dispose\(\)/);
    expect(stopBlock).toMatch(/session\.disconnect\(\)/);
    expect(stopBlock).toMatch(/for\s*\(\s*const unsub of voiceSessionUnsubsRef\.current\s*\)/);
    expect(stopBlock).toMatch(/jsErrorBreadcrumb\('voiceSession\.unsubscribe'/);
    expect(stopBlock).toMatch(/VoiceSession\.end\(\)/);
    expect(stopBlock).toMatch(/jsErrorBreadcrumb\('voiceSession\.end'/);
  });

  it('audio capture start failure unsubscribes every native listener before recoverable fallback', () => {
    const startFailureBlock = sliceFrom('.catch((err: unknown) => {', 1000);

    expect(startFailureBlock).toMatch(/cleanupNativeCapture\(\)/);
    expect(startFailureBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.start'/);
    expect(startFailureBlock).toMatch(/audio_capture_start_failed/);
    expect(startFailureBlock).toMatch(/setError\(`Micro không khả dụng\./);
    expect(startFailureBlock).toMatch(/transition\('ERROR_RECOVERABLE'\)/);
  });

  it('stop during pending VoiceMic.start invalidates the generation and stops stale native capture', () => {
    expect(hook).toMatch(/audioCaptureCleanupRef\s*=\s*useRef<\(\(\) => void\) \| null>\(null\)/);
    expect(hook).toMatch(/audioCaptureGenerationRef\s*=\s*useRef\(0\)/);

    const startBlock = sliceFrom('function _startAudioCapture(): void {', 8000);
    expect(startBlock).toMatch(/const captureGeneration = audioCaptureGenerationRef\.current \+ 1/);
    expect(startBlock).toMatch(/audioCaptureCleanupRef\.current\s*=\s*cleanupNativeCapture/);
    expect(startBlock).toMatch(/audioCaptureGenerationRef\.current !== captureGeneration/);
    expect(startBlock).toMatch(/VoiceMic\.stop\(\)\.catch\(\(err\) => \{/);
    expect(startBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.stopAfterStaleStart'/);

    const stopBlock = sliceFrom('function _stopAudioCapture(): void {', 1200);
    expect(stopBlock).toMatch(/audioCaptureGenerationRef\.current \+= 1/);
    expect(stopBlock).toMatch(/audioCaptureCleanupRef\.current\(\)/);
    expect(stopBlock).toMatch(/VoiceMic\.stop\(\)\.catch\(\(err\) => \{/);
    expect(stopBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.stop'/);
  });

  it('audio cleanup failures emit breadcrumbs instead of being swallowed silently', () => {
    const stopCaptureBlock = sliceFrom('function _stopAudioCapture(): void {', 600);
    expect(stopCaptureBlock).not.toMatch(/catch\s*\{\s*\}/);
    expect(stopCaptureBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.stop'/);

    const captureBlock = sliceFrom("track('capture', 'audio_capture_init'", 5200);
    expect(captureBlock).not.toMatch(/setAecFallbackGate\([^)]*\)\.catch\(\(\)\s*=>\s*\{\s*\}\)/);
    expect(captureBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.setAecFallbackGate'/);
  });
});
