/**
 * useVoiceTelemetry — thin wrapper around the voice telemetry dispatcher.
 *
 * Guarantees that raw transcript text never leaves the device: callers
 * must use length-only helpers for input/output transcripts. Other event
 * fields are sanitised defensively so an accidental transcript key does
 * not leak PII/COPPA-sensitive text.
 */
import { useCallback, useMemo } from 'react';
import {
  jsErrorBreadcrumb as baseJsErrorBreadcrumb,
  track as baseTrack,
  type VoiceTelemetryCategory,
} from '../services/observability/voice-telemetry';

const TRANSCRIPT_FIELDS: Record<string, true> = {
  text: true,
  userTranscript: true,
  aiTranscript: true,
  inputTranscript: true,
  outputTranscript: true,
};

function sanitizeFields(
  fields: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  let mutated = false;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (TRANSCRIPT_FIELDS[key] && typeof value === 'string') {
      mutated = true;
      copy[key] = `<redacted:${value.length}chars>`;
    } else {
      copy[key] = value;
    }
  }
  return mutated ? copy : fields;
}

export interface UseVoiceTelemetryReturn {
  track: (category: VoiceTelemetryCategory, event: string, fields?: Record<string, unknown>) => void;
  jsErrorBreadcrumb: (where: string, err: unknown, extra?: Record<string, unknown>) => void;
  /** Length-only input transcript telemetry — never send raw text. */
  trackInputTranscript: (length: number) => void;
  /** Length-only output transcript telemetry — never send raw text. */
  trackOutputTranscript: (length: number) => void;
}

export function useVoiceTelemetry(): UseVoiceTelemetryReturn {
  const track = useCallback(
    (category: VoiceTelemetryCategory, event: string, fields?: Record<string, unknown>) => {
      baseTrack(category, event, sanitizeFields(fields));
    },
    [],
  );

  const trackInputTranscript = useCallback((length: number) => {
    baseTrack('provider', 'input_transcript', { chars: length });
  }, []);

  const trackOutputTranscript = useCallback((length: number) => {
    baseTrack('provider', 'output_transcript', { chars: length });
  }, []);

  return useMemo(
    () => ({
      track,
      jsErrorBreadcrumb: baseJsErrorBreadcrumb,
      trackInputTranscript,
      trackOutputTranscript,
    }),
    [track, trackInputTranscript, trackOutputTranscript],
  );
}
