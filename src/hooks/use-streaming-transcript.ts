/**
 * useStreamingTranscript — Manages accumulation of streaming STT partial/final results.
 *
 * Deepgram with interim_results=true sends:
 * - Partials (isFinal=false): accumulated text for current utterance segment
 *   e.g. "Hello" → "Hello TBOT" → "Hello TBOT can you"
 * - Finals (isFinal=true): confirmed segment text. New segment starts after.
 * - Multiple finals per turn on natural pauses.
 *
 * This hook accumulates finals across segments and displays the current partial,
 * providing visual distinction between confirmed and unconfirmed text.
 */
import { useState, useRef, useCallback } from 'react';

export interface StreamingTranscriptState {
  /** Accumulated confirmed segments (normal opacity) */
  confirmedText: string;
  /** Current unconfirmed partial (italic, lower opacity) */
  partialText: string;
  /** Full display text (confirmed + partial) */
  displayText: string;
  /** Whether any text is being shown */
  hasText: boolean;
}

export interface StreamingTranscriptActions {
  /** Called on TRANSCRIPT_PARTIAL — updates current partial segment */
  onPartial: (text: string) => void;
  /** Called on TRANSCRIPT_FINAL — confirms current segment, starts new one */
  onFinal: (text: string) => void;
  /** Returns the full accumulated transcript and resets all state */
  finalize: () => string;
  /** Reset all state (for errors, new turns) */
  reset: () => void;
}

export function useStreamingTranscript(): [StreamingTranscriptState, StreamingTranscriptActions] {
  const confirmedSegmentsRef = useRef<string[]>([]);
  const [confirmedText, setConfirmedText] = useState('');
  const [partialText, setPartialText] = useState('');

  // Ref mirror for partialText so finalize() can read it synchronously
  const partialTextRef = useRef('');

  const onPartial = useCallback((text: string) => {
    // Deepgram partials are already accumulated within a segment
    // Just display confirmed segments + this partial
    setPartialText(text);
    partialTextRef.current = text;
  }, []);

  const onFinal = useCallback((text: string) => {
    if (text.trim()) {
      confirmedSegmentsRef.current.push(text.trim());
      setConfirmedText(confirmedSegmentsRef.current.join(' '));
    }
    setPartialText('');  // Clear partial, new segment starts
    partialTextRef.current = '';
  }, []);

  const finalize = useCallback((): string => {
    // Include current partial as fallback when user stops before Deepgram
    // emits a final (e.g., quick tap-to-stop mid-utterance)
    const segments = [...confirmedSegmentsRef.current];
    const currentPartial = partialTextRef.current.trim();
    if (currentPartial) segments.push(currentPartial);
    confirmedSegmentsRef.current = [];
    partialTextRef.current = '';
    setConfirmedText('');
    setPartialText('');
    return segments.join(' ').trim();
  }, []);

  const reset = useCallback(() => {
    confirmedSegmentsRef.current = [];
    partialTextRef.current = '';
    setConfirmedText('');
    setPartialText('');
  }, []);

  const confirmed = confirmedText;
  const partial = partialText;
  const displayText = confirmed && partial ? `${confirmed} ${partial}` : confirmed || partial;

  return [
    { confirmedText: confirmed, partialText: partial, displayText, hasText: !!displayText },
    { onPartial, onFinal, finalize, reset },
  ];
}
