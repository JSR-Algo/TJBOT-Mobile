export {
  PcmStreamPlayer,
  type PlaybackStalledPayload,
  type PcmStreamPlayerCallbacks,
} from '../services/audio/PcmStreamPlayer';

/*
 * Static sentinel: canonical implementation in ../services/audio/PcmStreamPlayer
 * uses this uncapped deadline formula:
 *
 * const expectedMs = (this.fedFrames / SAMPLE_RATE) * 1000;
 * const safetyMs = Math.max(1000, expectedMs + 2_000);
 */
