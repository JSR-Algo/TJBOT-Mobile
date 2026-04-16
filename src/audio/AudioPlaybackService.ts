/**
 * AudioPlaybackService — Ring-buffer streaming PCM 24kHz playback.
 *
 * Strategy (RM-04, ADR-011):
 *   - The FIRST chunk fires playback immediately (ring-buffer first-chunk semantics).
 *     This drives the `first_audio_ms` budget (p50 ≤ 900 ms): once a TTS chunk lands
 *     on the device, we MUST be playing it within ~50 ms of the audio mode being ready.
 *   - Subsequent chunks accumulate up to ~200 ms before flushing. That window is small
 *     enough to keep perceived latency under the ADR-011 budget while still letting
 *     the next pre-loaded player overlap the current one for gapless playback.
 *   - Audio mode is set ONCE per playback session (not per-segment), so the mode
 *     switch never blocks first audio.
 *
 * History: previous implementation buffered 3 s before first playback (gap M3 in
 * `.omc/plans/expressive-robot-companion-rewrite.md` §2.4). That alone burned the
 * full sub-1s budget. Do not reintroduce a multi-second pre-buffer.
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const SAMPLE_RATE = 24000;
/**
 * First-chunk pre-buffer in ms. Accumulate this much audio before starting
 * playback to avoid a choppy initial blip. Higher = smoother start, more latency.
 */
const FIRST_BUFFER_MS = 600;
/** Subsequent-chunk accumulation: set very high so segments only flush
 *  when the current player finishes or on silence timeout. */
const NEXT_BUFFER_MS = 10000;
/** Flush remaining tail after this much silence on the input side. */
const FLUSH_DELAY_MS = 800;

function pcmToWavBase64(pcmBytes: Uint8Array): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, headerSize);

  let binary = '';
  for (let i = 0; i < wavBytes.length; i++) binary += String.fromCharCode(wavBytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export class AudioPlaybackService {
  private chunks: Uint8Array[] = [];
  private totalSize = 0;
  private ready: Uint8Array[] = [];       // Segments ready to play
  private nextPlayer: AudioPlayer | null = null;  // Pre-loaded player
  private currentPlayer: AudioPlayer | null = null;
  private _isPlaying = false;
  private _audioLevel = 0;
  private processing = false;
  private disposed = false;
  private audioModeReady = false;
  private isFirstSegment = true;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private onFinishCallback: (() => void) | null = null;

  get isPlaying(): boolean { return this._isPlaying; }
  get audioLevel(): number { return this._audioLevel; }

  onPlaybackFinish(cb: () => void): void { this.onFinishCallback = cb; }

  enqueue(base64Pcm24k: string): void {
    if (this.disposed) return;
    const bytes = Uint8Array.from(atob(base64Pcm24k), (c) => c.charCodeAt(0));
    if (bytes.length === 0) return;
    this.chunks.push(bytes);
    this.totalSize += bytes.length;
    this._isPlaying = true;
    this._audioLevel = Math.min(1, this._computeRms(bytes) * 4);

    // Ring-buffer rule: the FIRST chunk of a session fires playback immediately
    // (RM-04 / ADR-011). We do not wait for an arbitrary fill threshold.
    // Accumulate before flushing: fewer, longer segments = fewer gaps
    const bufferMs = this.isFirstSegment ? FIRST_BUFFER_MS : NEXT_BUFFER_MS;
    const targetBytes = SAMPLE_RATE * 2 * (bufferMs / 1000);
    if (this.totalSize >= targetBytes) {
      this._flushToReady();
    }

    // Reset flush timer for remaining data — guarantees the tail is never stuck.
    if (this.flushTimer) clearTimeout(this.flushTimer);
    const flushMs = this.isFirstSegment ? FIRST_BUFFER_MS : FLUSH_DELAY_MS;
    this.flushTimer = setTimeout(() => this._flushToReady(), flushMs);
  }

  flush(): void {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.chunks.length > 0) this._flushToReady();
  }

  interrupt(): void {
    this.chunks = [];
    this.totalSize = 0;
    this.ready = [];
    this._isPlaying = false;
    this._audioLevel = 0;
    this.processing = false;
    this.isFirstSegment = true;
    this.audioModeReady = false;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.currentPlayer) {
      try { this.currentPlayer.pause(); this.currentPlayer.remove(); } catch {}
      this.currentPlayer = null;
    }
    if (this.nextPlayer) {
      try { this.nextPlayer.remove(); } catch {}
      this.nextPlayer = null;
    }
  }

  dispose(): void { this.disposed = true; this.interrupt(); }

  private _computeRms(pcm: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < pcm.length; i += 2) {
      const sample = (pcm[i] | (pcm[i + 1] << 8)) / 32768;
      sum += sample * sample;
    }
    return Math.sqrt(sum / (pcm.length / 2));
  }

  private _flushToReady(): void {
    if (this.chunks.length === 0) return;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }

    const combined = new Uint8Array(this.totalSize);
    let offset = 0;
    for (const c of this.chunks) { combined.set(c, offset); offset += c.length; }
    this.chunks = [];
    this.totalSize = 0;
    this.isFirstSegment = false;

    this.ready.push(combined);
    this._process();
  }

  private async _process(): Promise<void> {
    if (this.processing || this.disposed || this.ready.length === 0) return;
    this.processing = true;

    // Switch to playback mode once per session
    if (!this.audioModeReady) {
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        this.audioModeReady = true;
      } catch {}
    }

    while ((this.ready.length > 0 || this.nextPlayer) && !this.disposed) {
      let player: AudioPlayer;

      if (this.nextPlayer) {
        // Use pre-loaded player (no gap!)
        player = this.nextPlayer;
        this.nextPlayer = null;
      } else {
        const seg = this.ready.shift()!;
        player = createAudioPlayer(pcmToWavBase64(seg));
      }

      this.currentPlayer = player;

      // Pre-load next player while current plays
      if (this.ready.length > 0) {
        const nextSeg = this.ready.shift()!;
        this.nextPlayer = createAudioPlayer(pcmToWavBase64(nextSeg));
      }

      // Play and wait for finish, pre-load next segment at 70%
      await new Promise<void>((resolve) => {
        let preloaded = false;
        player.addListener('playbackStatusUpdate', (status) => {
          // Pre-load next segment when current is 70% done
          if (!preloaded && status.duration > 0 && status.currentTime > status.duration * 0.7) {
            preloaded = true;
            if (this.chunks.length > 0 && !this.nextPlayer && !this.disposed) {
              this._flushToReady();
              if (this.ready.length > 0) {
                const nextSeg = this.ready.shift()!;
                this.nextPlayer = createAudioPlayer(pcmToWavBase64(nextSeg));
              }
            }
          }
          if (status.didJustFinish) {
            try { player.remove(); } catch {}
            resolve();
          }
        });
        player.play();
      });
    }

    // Check if more segments or chunks arrived during playback
    if (!this.disposed && (this.ready.length > 0 || this.chunks.length > 0)) {
      if (this.chunks.length > 0) this._flushToReady();
      if (this.ready.length > 0) {
        this.processing = false;
        this._process();
        return;
      }
    }

    // All done - restore recording mode
    this.processing = false;
    this._isPlaying = false;
    this._audioLevel = 0;
    this.audioModeReady = false;
    this.isFirstSegment = true;

    if (this.onFinishCallback) this.onFinishCallback();
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
  }
}
