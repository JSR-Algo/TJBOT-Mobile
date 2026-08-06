import type { LessonSessionEvent } from './lessonSession.types';

type BackendTurnCompleteFrame = {
  type: 'TURN_COMPLETE';
  sessionId: string;
  turnId: string;
  responseText: string;
  fallback?: boolean;
};

/**
 * The session epoch the frame is checked against. Callers pass the machine's
 * live `context.sessionId`, which is `null` before `SESSION_STARTED` and stays
 * pinned to the terminated session's id after a terminal.
 */
export type LessonSessionEpoch = {
  sessionId: string | null;
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

/**
 * Translate a backend realtime frame into a machine event, or `null` to drop it.
 *
 * The `epoch` argument is REQUIRED, not optional: the frame carries a
 * `sessionId` and every frame must be proved to belong to the session the
 * machine is currently running. A late frame from a previous session — the WS
 * flushing a queued turn after the child exited, or a second session started on
 * a retry tap — must never drive the current UI. Dropping the epoch check is
 * what lets a stale `TURN_COMPLETE` pull a live `ACTIVE.THINKING` back to
 * `ACTIVE.ROBOT_LISTENING` on behalf of a session that no longer exists.
 *
 * `epoch.sessionId === null` means no session has started (or the machine never
 * received `SESSION_STARTED`), so there is nothing a frame could legitimately
 * advance — every frame is dropped.
 */
export function lessonSessionEventFromRealtimeFrame(
  value: unknown,
  epoch: LessonSessionEpoch,
): LessonSessionEvent | null {
  if (!isBackendTurnCompleteFrame(value)) return null;
  if (epoch.sessionId === null) return null;
  if (value.sessionId !== epoch.sessionId) return null;
  return {
    type: 'TURN_COMPLETE',
    turnId: value.turnId,
    responseText: value.responseText,
    ...(value.fallback !== undefined ? { fallback: value.fallback } : {}),
  };
}
