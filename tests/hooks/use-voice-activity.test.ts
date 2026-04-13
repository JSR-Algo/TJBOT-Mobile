/**
 * RM-06 — useVoiceActivity hold-off + perceived-reaction trigger.
 *
 * Acceptance criteria (Wave 2 brief, expressive-robot-companion-rewrite §6 RM-06):
 *   1. VAD silence hold-off lowered from 600 ms → 350 ms (gap M7).
 *   2. A new `onSpeechEnd` callback fires the instant speech frames stop —
 *      BEFORE the hold-off — so the consumer can drive a perceived-reaction
 *      face animation while waiting for the partial transcript.
 *
 * These tests lock in both behaviours so a regression is caught at CI time.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useVoiceActivity, isSpeechFrame } from '../../src/hooks/use-voice-activity';

/** Encode a Uint8Array (raw bytes) as base64. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}

/** Build a 60 ms PCM frame at 16 kHz with the given peak amplitude (signed 16-bit). */
function makePcmFrame(peak: number, ms = 60): string {
  const samples = Math.round((16000 * ms) / 1000);
  const bytes = new Uint8Array(samples * 2);
  for (let i = 0; i < samples; i++) {
    const v = Math.round(Math.sin((i / samples) * Math.PI * 8) * peak);
    bytes[i * 2] = v & 0xff;
    bytes[i * 2 + 1] = (v >> 8) & 0xff;
  }
  return toBase64(bytes);
}

const SPEECH_FRAME = makePcmFrame(8000); // ~25% full scale → above 0.015 threshold
const SILENCE_FRAME = makePcmFrame(0); // pure zeros → below threshold

describe('useVoiceActivity — RM-06 hold-off + perceived-reaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('helper isSpeechFrame correctly classifies the synthesized frames', () => {
    // Sanity check on the test fixtures themselves so the hook tests below
    // are not silently passing on bogus input.
    const speechSamples = new Int16Array(960);
    for (let i = 0; i < speechSamples.length; i++) {
      speechSamples[i] = Math.round(Math.sin((i / speechSamples.length) * Math.PI * 8) * 8000);
    }
    const silenceSamples = new Int16Array(960);

    expect(isSpeechFrame(speechSamples)).toBe(true);
    expect(isSpeechFrame(silenceSamples)).toBe(false);
  });

  it('default silence hold-off is 350 ms (lowered from 600 ms by RM-06)', () => {
    const onSilence = jest.fn();
    const { result } = renderHook(() =>
      useVoiceActivity({ onSilence }),
    );

    act(() => {
      result.current.startListening();
      // Two speech frames to confirm onset.
      result.current.processFrame(SPEECH_FRAME);
      result.current.processFrame(SPEECH_FRAME);
      // Switch to silence — schedules the hold-off timer.
      result.current.processFrame(SILENCE_FRAME);
    });

    // 349 ms after silence: hold-off has NOT elapsed.
    act(() => {
      jest.advanceTimersByTime(349);
    });
    expect(onSilence).not.toHaveBeenCalled();

    // Tip past 350 ms: hold-off has elapsed and onSilence MUST have fired.
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(onSilence).toHaveBeenCalledTimes(1);
  });

  it('hold-off is NOT 600 ms anymore (regression guard for gap M7)', () => {
    const onSilence = jest.fn();
    const { result } = renderHook(() =>
      useVoiceActivity({ onSilence }),
    );

    act(() => {
      result.current.startListening();
      result.current.processFrame(SPEECH_FRAME);
      result.current.processFrame(SPEECH_FRAME);
      result.current.processFrame(SILENCE_FRAME);
    });

    // At 500 ms onSilence MUST have fired under the new default.
    // It would NOT have under the old 600 ms default.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onSilence).toHaveBeenCalledTimes(1);
  });

  it('explicit silenceHoldMs override is honoured', () => {
    const onSilence = jest.fn();
    const { result } = renderHook(() =>
      useVoiceActivity({ silenceHoldMs: 100, onSilence }),
    );

    act(() => {
      result.current.startListening();
      result.current.processFrame(SPEECH_FRAME);
      result.current.processFrame(SPEECH_FRAME);
      result.current.processFrame(SILENCE_FRAME);
    });

    act(() => {
      jest.advanceTimersByTime(99);
    });
    expect(onSilence).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(onSilence).toHaveBeenCalledTimes(1);
  });

  it('onSpeechEnd fires immediately on the first non-speech frame, BEFORE the hold-off', () => {
    const onSpeechStart = jest.fn();
    const onSpeechEnd = jest.fn();
    const onSilence = jest.fn();

    const { result } = renderHook(() =>
      useVoiceActivity({ onSpeechStart, onSpeechEnd, onSilence }),
    );

    act(() => {
      result.current.startListening();
      result.current.processFrame(SPEECH_FRAME);
      result.current.processFrame(SPEECH_FRAME);
    });
    expect(onSpeechStart).toHaveBeenCalledTimes(1);
    expect(onSpeechEnd).not.toHaveBeenCalled();

    // First silence frame → perceived-reaction trigger fires immediately.
    act(() => {
      result.current.processFrame(SILENCE_FRAME);
    });
    expect(onSpeechEnd).toHaveBeenCalledTimes(1);
    expect(onSilence).not.toHaveBeenCalled(); // hold-off still pending

    // Hold-off completes → onSilence fires.
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(onSilence).toHaveBeenCalledTimes(1);
  });

  it('onSpeechEnd does NOT fire if speech frames never started', () => {
    const onSpeechEnd = jest.fn();
    const { result } = renderHook(() =>
      useVoiceActivity({ onSpeechEnd }),
    );

    act(() => {
      result.current.startListening();
      result.current.processFrame(SILENCE_FRAME);
      result.current.processFrame(SILENCE_FRAME);
    });

    expect(onSpeechEnd).not.toHaveBeenCalled();
  });
});
