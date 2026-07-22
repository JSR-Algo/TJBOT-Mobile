/**
 * Lesson-delivery connector — honest ConnectorResult semantics for pushing
 * lessons to the physical robot.
 *
 * Wraps the course-library assignment/preload/send-to-robot API calls and the
 * /robot-lessons/* session endpoints (start / stop / status polling reads) in
 * the robot-link vocabulary (see services/connectors/types.ts):
 * - success → { state: 'ok', value }
 * - known link failures → linkBlocked(mapErrorToLinkState(error)) with the
 *   normalized message as reason (ROBOT_BRIDGE_UNAVAILABLE → robot_offline,
 *   transport/5xx → server_unavailable, contract gaps → unsupported_until_connector)
 * - anything else rethrows so callers keep their normal error UX.
 *
 * Manual impact note (new module, 2026-07-18): no upstream callers before this
 * lane; first consumer is RobotLessonControlScreen (P2 mobile de-fake).
 * Investor-demo short-circuiting stays inside course-library.api (unchanged);
 * demo surfaces must badge themselves Simulated via getDemoBadgeState().
 */
import {
  createAssignment,
  getPreloadStatus,
  sendCourseToRobot as sendCourseToRobotApi,
  type CreateAssignmentParams,
  type LessonAssignment,
  type PreloadStatus,
} from '@/services/api/course-library.api';
import client from '@/services/http/client';
import { normalizeError } from '@/utils/errors';
import {
  linkBlocked,
  mapErrorToLinkState,
  ok,
  type ConnectorResult,
} from '@/services/connectors/types';

/** Session status shape returned by the /robot-lessons/* endpoints. */
export interface RobotLessonStatus {
  sessionId: string;
  deviceId: string;
  childId: string;
  lessonId: string;
  state: string;
  startedAt: string;
}

export type StartRobotLessonParams = {
  deviceId: string;
  childId: string;
  lessonId?: string;
  sessionIndex?: number;
  childName?: string;
  ageBand?: string;
};

export type StartRobotLessonResult = RobotLessonStatus & { errorReason?: string };

function toBlockedResult(error: unknown): ConnectorResult<never> {
  const state = mapErrorToLinkState(error);
  if (state === null) throw error;
  const normalized = normalizeError(error);
  return linkBlocked(state, normalized.message, normalized.retryable === true);
}

/** Assign one lesson to one device for one child (M1 contract). */
export async function assignLessonToRobot(
  params: CreateAssignmentParams,
): Promise<ConnectorResult<LessonAssignment>> {
  try {
    return ok(await createAssignment(params));
  } catch (error) {
    return toBlockedResult(error);
  }
}

/** Server-authoritative preload status for a device (M2 poll target). */
export async function getLessonPreloadStatus(
  deviceId: string,
): Promise<ConnectorResult<PreloadStatus>> {
  try {
    return ok(await getPreloadStatus(deviceId));
  } catch (error) {
    return toBlockedResult(error);
  }
}

/** Push a library course to the robot (legacy send-to-robot contract). */
export async function sendCourseToRobot(
  courseId: string,
  deviceId: string,
  childId: string,
  requestId?: string,
): Promise<ConnectorResult<void>> {
  try {
    await sendCourseToRobotApi(courseId, deviceId, childId, requestId);
    return ok(undefined);
  } catch (error) {
    return toBlockedResult(error);
  }
}

/** Start a voice lesson session on the robot (/robot-lessons/start). */
export async function startRobotLesson(
  params: StartRobotLessonParams,
): Promise<ConnectorResult<StartRobotLessonResult>> {
  try {
    const response = await client.post('/robot-lessons/start', params);
    return ok(response.data as StartRobotLessonResult);
  } catch (error) {
    return toBlockedResult(error);
  }
}

/** Stop a running robot lesson session (/robot-lessons/:sessionId/stop). */
export async function stopRobotLesson(sessionId: string): Promise<ConnectorResult<void>> {
  try {
    await client.post(`/robot-lessons/${encodeURIComponent(sessionId)}/stop`);
    return ok(undefined);
  } catch (error) {
    return toBlockedResult(error);
  }
}

/** Single status read for a robot lesson session (/robot-lessons/:sessionId/status). */
export async function getRobotLessonStatus(
  sessionId: string,
): Promise<ConnectorResult<RobotLessonStatus>> {
  try {
    const response = await client.get(`/robot-lessons/${encodeURIComponent(sessionId)}/status`);
    return ok(response.data as RobotLessonStatus);
  } catch (error) {
    return toBlockedResult(error);
  }
}
