/**
 * VoiceMic JS shim — graceful no-op contract when NativeModules.VoiceMicModule
 * is absent (current simulator / test / dev build state before the native
 * module ships).
 *
 * Scope: contract-only. The real native behavior is tested in the Android
 * VoiceMicModuleTest.kt and iOS VoiceMicModuleTests.swift (per plan §8).
 */
import { VoiceMic } from '../../src/native/VoiceMic';

describe('VoiceMic (test environment — native module absent)', () => {
  it('reports unavailable', () => {
    expect(VoiceMic.isAvailable).toBe(false);
  });

  it('start/stop/mute are safe no-ops', async () => {
    await expect(
      VoiceMic.start({ sampleRate: 16000, channels: 1, bitsPerSample: 16, aec: 'hw' }),
    ).resolves.toBeUndefined();
    await expect(VoiceMic.stop()).resolves.toBeUndefined();
    await expect(VoiceMic.mute(true)).resolves.toBeUndefined();
    await expect(VoiceMic.mute(false)).resolves.toBeUndefined();
  });

  it('getDiagnostics returns null when native absent', async () => {
    await expect(VoiceMic.getDiagnostics()).resolves.toBeNull();
  });

  it('onData returns a no-op unsubscriber', () => {
    const unsub = VoiceMic.onData(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('onStall returns a no-op unsubscriber', () => {
    const unsub = VoiceMic.onStall(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});
