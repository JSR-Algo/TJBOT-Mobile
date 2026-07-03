import type { LessonSessionEvent } from './lessonSession.types';

type BackendTurnCompleteFrame = {
  type: 'TURN_COMPLETE';
  sessionId: string;
  turnId: string;
  responseText: string;
  fallback?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isBackendTurnCompleteFrame(value: unknown): value is BackendTurnCompleteFrame {
  if (!isRecord(value)) return false;
  if (value.type !== 'TURN_COMPLETE') return false;
  if (typeof value.sessionId !== 'string' || value.sessionId.length === 0) return false;
  if (typeof value.turnId !== 'string' || value.turnId.length === 0) return false;
  if (typeof value.responseText !== 'string') return false;
  if (value.fallback !== undefined && typeof value.fallback !== 'boolean') return false;
  return true;
}

export function lessonSessionEventFromRealtimeFrame(value: unknown): LessonSessionEvent | null {
  if (!isBackendTurnCompleteFrame(value)) return null;
  return {
    type: 'TURN_COMPLETE',
    turnId: value.turnId,
    responseText: value.responseText,
    ...(value.fallback !== undefined ? { fallback: value.fallback } : {}),
  };
}
