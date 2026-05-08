/**
 * voice-output-recorder.ts — QA utility for BI1-BI6 audio-output assertions.
 *
 * Used by the X1/X2/X3 regression scripts to read back WAV files written by
 * the native test harness (iOS PcmStreamModule.swift + Android PcmStreamModule.kt)
 * when EXPO_PUBLIC_VOICE_TEST_HARNESS=true.
 *
 * Files are written to:
 *   iOS:     <app Documents>/voice-test-output/<responseId>.wav
 *   Android: <app filesDir>/voice-test-output/<responseId>.wav
 *
 * This utility provides:
 *   - listRecordings()  — list responseIds with recorded files
 *   - readWav(rid)      — read WAV bytes for a responseId
 *   - parseWav(buf)     — parse WAV header + PCM samples (Int16Array)
 *   - rmsLevel(samples) — RMS level of a PCM sample array in [0, 1]
 *   - deleteAll()       — clean up after a test run
 *
 * RNFS is resolved at runtime in the Detox/e2e environment. Import is declared
 * as a lazy require so the module compiles cleanly without the native package
 * being installed in the dev dependency set.
 */

import { Platform } from 'react-native';

// Lazy runtime import — RNFS is only available in the Detox runner environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RNFS = any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RNFS: RNFS = (() => { try { return require('react-native-fs'); } catch { return null; } })();

const OUTPUT_DIR: string = Platform.OS === 'ios'
  ? `${RNFS?.DocumentDirectoryPath ?? ''}/voice-test-output`
  : `${RNFS?.FilesDirectoryPath ?? ''}/voice-test-output`;

/** List all responseIds that have a recorded WAV file in the output dir. */
export async function listRecordings(): Promise<string[]> {
  if (!RNFS) return [];
  try {
    const items: Array<{ isFile: () => boolean; name: string }> = await RNFS.readDir(OUTPUT_DIR);
    return items
      .filter((i) => i.isFile() && i.name.endsWith('.wav'))
      .map((i) => i.name.replace(/\.wav$/, ''));
  } catch {
    return [];
  }
}

/** Read raw WAV bytes for a given responseId. Returns null if not found. */
export async function readWav(responseId: string): Promise<Buffer | null> {
  if (!RNFS) return null;
  const safe = responseId.replace(/[/:]/g, '_');
  const path = `${OUTPUT_DIR}/${safe}.wav`;
  try {
    const b64: string = await RNFS.readFile(path, 'base64');
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

export interface WavParsed {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  durationMs: number;
  /** PCM16 samples in [-32768, 32767] */
  samples: Int16Array;
}

/**
 * Parse a WAV buffer. Handles standard 44-byte PCM WAV headers only.
 * Throws if the header is malformed.
 */
export function parseWav(buf: Buffer): WavParsed {
  if (buf.length < 44) throw new Error('WAV buffer too short');
  const riff = buf.toString('ascii', 0, 4);
  const wave = buf.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('Not a WAV file');

  const audioFormat = buf.readUInt16LE(20);
  if (audioFormat !== 1) throw new Error(`Non-PCM WAV (audioFormat=${audioFormat})`);

  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  const dataLen = buf.readUInt32LE(40);

  const pcm = buf.slice(44, 44 + dataLen);
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = Math.floor(pcm.length / bytesPerSample);
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = pcm.readInt16LE(i * 2);
  }

  const durationMs = (sampleCount / (sampleRate * channels)) * 1000;
  return { sampleRate, channels, bitsPerSample, durationMs, samples };
}

/** RMS level of a PCM sample array in [0, 1]. */
export function rmsLevel(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const norm = samples[i] / 32768;
    sum += norm * norm;
  }
  return Math.sqrt(sum / samples.length);
}

/** Delete all recorded WAV files from the output directory. */
export async function deleteAll(): Promise<void> {
  if (!RNFS) return;
  try {
    const items: Array<{ isFile: () => boolean; path: string; name: string }> =
      await RNFS.readDir(OUTPUT_DIR);
    await Promise.all(
      items
        .filter((i) => i.isFile() && i.name.endsWith('.wav'))
        .map((i) => RNFS.unlink(i.path)),
    );
  } catch {
    // Directory may not exist yet — no-op.
  }
}
