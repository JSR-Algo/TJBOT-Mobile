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
  it('permission denial and permission request failure route to ERROR_RECOVERABLE', () => {
    const permissionBlock = sliceFrom('mic_permission_requested', 900);

    expect(permissionBlock).toMatch(/requestRecordingPermissionsAsync\(\)/);
    expect(permissionBlock).toMatch(/if\s*\(!granted\)\s*\{/);
    expect(permissionBlock).toMatch(/setError\('C\\u1ea7n quy\\u1ec1n micro \\u0111\\u1ec3 tr\\u00f2 chuy\\u1ec7n\.'\)/);
    expect(permissionBlock).toMatch(/transition\('ERROR_RECOVERABLE'\)/);
    expect(permissionBlock).toMatch(/catch\s*\{/);
    expect(permissionBlock).toMatch(/setError\('Kh\\u00f4ng th\\u1ec3 y\\u00eau c\\u1ea7u quy\\u1ec1n micro\.'\)/);
    expect(permissionBlock).toMatch(/transition\('ERROR_RECOVERABLE'\)/);
  });

  it('stopConversation cleans timers, capture, playback, SDK session, and voice session subscriptions', () => {
    const stopBlock = sliceFrom('const stopConversation = useCallback', 1900);

    expect(stopBlock).toMatch(/clearTimeout\(simulatorReplyTimerRef\.current\)/);
    expect(stopBlock).toMatch(/clearTimeout\(silenceTimerRef\.current\)/);
    expect(stopBlock).toMatch(/stopAudioCaptureRef\.current\?\.\(\)/);
    expect(stopBlock).toMatch(/playbackRef\.current\?\.interrupt\(\)/);
    expect(stopBlock).toMatch(/playbackRef\.current\s*=\s*null/);
    expect(stopBlock).toMatch(/if\s*\(disposingPlayback\)\s*\{/);
    expect(stopBlock).toMatch(/disposingPlayback\.dispose\(\)\.catch/);
    expect(stopBlock).toMatch(/sessionRef\.current\?\.close\?\.\(\)/);
    expect(stopBlock).toMatch(/sessionRef\.current\s*=\s*null/);
    expect(stopBlock).toMatch(/for\s*\(\s*const unsub of voiceSessionUnsubsRef\.current\s*\)/);
    expect(stopBlock).toMatch(/jsErrorBreadcrumb\('voiceSession\.unsubscribe'/);
    expect(stopBlock).toMatch(/VoiceSession\.end\(\)/);
    expect(stopBlock).toMatch(/jsErrorBreadcrumb\('voiceSession\.end'/);
  });

  it('audio capture start failure unsubscribes every native listener before recoverable fallback', () => {
    const startFailureBlock = sliceFrom('.catch((err: unknown) => {', 700);

    expect(startFailureBlock).toMatch(/cleanupNativeCapture\(\)/);
    expect(startFailureBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.start'/);
    expect(startFailureBlock).toMatch(/audio_capture_start_failed/);
    expect(startFailureBlock).toMatch(/setError\('Micro không khả dụng\.'\)/);
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
    expect(stopBlock).toMatch(/jsErrorBreadcrumb\('voiceMic\.stopPendingStart'/);
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
