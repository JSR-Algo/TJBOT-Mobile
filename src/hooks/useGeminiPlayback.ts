/**
 * useGeminiPlayback — PCM playback controller for Gemini Live.
 *
 * Owns the PcmStreamPlayer lifecycle and exposes the small surface the
 * composer needs: enqueue, interrupt, startResponse, endTurn, dispose.
 * Higher-level state transitions (WAITING_AI → ASSISTANT_SPEAKING, etc.)
 * remain in the composer because they need store + timer coordination.
 */
import { useRef, useCallback, useMemo } from 'react';
import { PcmStreamPlayer as AudioPlaybackService } from '../services/audio/PcmStreamPlayer';

export interface AudioPart {
  data: string;
}

export interface UseGeminiPlaybackReturn {
  /** Ref to the native playback service. */
  playbackRef: React.MutableRefObject<AudioPlaybackService | null>;
  /** Create the player if it does not exist and return it. */
  ensureCreated: () => AudioPlaybackService;
  /** Low-level PCM enqueue. */
  enqueue: (data: string) => void;
  /** Interrupt/clear queued audio. */
  interrupt: () => Promise<void>;
  /** Tell the native layer a new response turn is starting. */
  startResponse: (rid: string) => void;
  /** Mark the current turn closed so native can drain. */
  endTurn: () => void;
  /** Hint that a sentence boundary arrived (phrase-aware flush). */
  markSentenceBoundary: () => void;
  /** Tear down the player. */
  dispose: () => void;
}

export function useGeminiPlayback(): UseGeminiPlaybackReturn {
  const playbackRef = useRef<AudioPlaybackService | null>(null);

  const ensureCreated = useCallback((): AudioPlaybackService => {
    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackService();
    }
    return playbackRef.current;
  }, []);

  const enqueue = useCallback((data: string): void => {
    playbackRef.current?.enqueue(data);
  }, []);

  const interrupt = useCallback(async (): Promise<void> => {
    await playbackRef.current?.interrupt();
  }, []);

  const startResponse = useCallback((rid: string): void => {
    playbackRef.current?.startResponse?.(rid);
  }, []);

  const endTurn = useCallback((): void => {
    playbackRef.current?.endTurn();
  }, []);

  const markSentenceBoundary = useCallback((): void => {
    playbackRef.current?.markSentenceBoundary();
  }, []);

  const dispose = useCallback((): void => {
    const player = playbackRef.current;
    playbackRef.current = null;
    if (player) {
      player.dispose().catch(() => {
        /* disposal errors are logged by the caller if needed */
      });
    }
  }, []);

  return useMemo(
    () => ({
      playbackRef,
      ensureCreated,
      enqueue,
      interrupt,
      startResponse,
      endTurn,
      markSentenceBoundary,
      dispose,
    }),
    [ensureCreated, enqueue, interrupt, startResponse, endTurn, markSentenceBoundary, dispose],
  );
}
