import { ROUTES } from '@/navigation/routes';

export type RecoveryReason =
  | 'network'
  | 'voice_failed'
  | 'mic_missing'
  | 'audio_route_changed'
  | 'audio_recovered'
  | 'safety'
  | 'app_error';

export type ResumeTarget =
  | typeof ROUTES.RunningScreen
  | typeof ROUTES.HomeHubScreen;

export type LessonPhase = 'connecting' | 'greeting' | 'listening' | 'speaking' | 'done';

export type RecoverySessionState = 'active' | 'terminated' | 'expired';

export type RecoveryAuthState = 'authenticated' | 'expired';

export type LessonCheckpoint = {
  readonly version: 1;
  readonly lessonTitle: string;
  readonly progressLabel: string;
  readonly resumeTarget: ResumeTarget;
  readonly reason: RecoveryReason;
  readonly phase: LessonPhase;
  readonly sessionState: RecoverySessionState;
  readonly authState: RecoveryAuthState;
  readonly activityLabel?: string;
  readonly elapsedLabel?: string;
  readonly courseId?: string;
  readonly childId?: string;
  readonly deviceId: string;
  readonly assignmentId: string;
  readonly sessionId?: string;
  readonly assignmentVersion?: number;
  readonly manifestChecksum?: string | null;
};

export type CurrentAssignmentCheckpointInput = {
  readonly assignmentId?: unknown;
  readonly sessionId?: unknown;
  readonly assignmentVersion?: unknown;
  readonly lessonTitle?: unknown;
  readonly manifestChecksum?: unknown;
  readonly state?: unknown;
  readonly childId?: unknown;
};

export type ReconnectContext = {
  readonly attempt?: number;
  readonly maxAttempts?: number;
  readonly checkpoint?: LessonCheckpoint;
  readonly failureTarget?: typeof ROUTES.HelpFaqScreen | typeof ROUTES.HomeHubScreen;
};

export type SupportTopic = 'hardware' | 'sound' | 'wifi' | 'lessons' | 'account' | 'app_error' | 'other';

export type SupportContext = {
  readonly topic?: SupportTopic;
  readonly errorFamily?: RecoveryReason | 'robot_offline' | 'factory_reset';
  readonly retryCount?: number;
  readonly robotIdSuffix?: string;
};

export type RecoveryDecision =
  | { readonly kind: 'resume'; readonly checkpoint: LessonCheckpoint }
  | { readonly kind: 'reauth'; readonly checkpoint: LessonCheckpoint }
  | { readonly kind: 'ended'; readonly reason: 'done' | 'terminated' | 'expired' | 'invalid_checkpoint' };

type RecoveryScreen =
  | typeof ROUTES.NetworkErrorScreen
  | typeof ROUTES.VoiceFailedScreen
  | typeof ROUTES.MicMissingScreen
  | typeof ROUTES.AudioRecoveryScreen
  | typeof ROUTES.LessonResumeScreen
  | typeof ROUTES.SafetyRedirectScreen
  | typeof ROUTES.AppErrorScreen;

const recoveryReasons: ReadonlySet<string> = new Set([
  'network',
  'voice_failed',
  'mic_missing',
  'audio_route_changed',
  'audio_recovered',
  'safety',
  'app_error',
]);

const resumeTargets: ReadonlySet<string> = new Set([
  ROUTES.RunningScreen,
  ROUTES.HomeHubScreen,
]);

const lessonPhases: ReadonlySet<string> = new Set([
  'connecting',
  'greeting',
  'listening',
  'speaking',
  'done',
]);

const sessionStates: ReadonlySet<string> = new Set([
  'active',
  'terminated',
  'expired',
]);

const authStates: ReadonlySet<string> = new Set([
  'authenticated',
  'expired',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRecoveryReason(value: unknown): value is RecoveryReason {
  return typeof value === 'string' && recoveryReasons.has(value);
}

function isResumeTarget(value: unknown): value is ResumeTarget {
  return typeof value === 'string' && resumeTargets.has(value);
}

function isLessonPhase(value: unknown): value is LessonPhase {
  return typeof value === 'string' && lessonPhases.has(value);
}

function isSessionState(value: unknown): value is RecoverySessionState {
  return typeof value === 'string' && sessionStates.has(value);
}

function isAuthState(value: unknown): value is RecoveryAuthState {
  return typeof value === 'string' && authStates.has(value);
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isOptionalChecksum(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isNonEmptyString(value);
}

function lessonPhaseForAssignmentState(state: unknown): LessonPhase | null {
  switch (state) {
    case 'ASSIGNED':
    case 'PRELOADING':
    case 'READY':
      return 'connecting';
    case 'RUNNING':
      return 'speaking';
    case 'PAUSED':
      return 'listening';
    default:
      return null;
  }
}

function phaseValue(value: unknown): LessonPhase | null {
  switch (value) {
    case 'connecting':
    case 'greeting':
    case 'listening':
    case 'speaking':
      return value;
    case 'idle':
      return 'listening';
    default:
      return null;
  }
}

export function lessonPhaseFromObserverFrame(frame: unknown): LessonPhase | null {
  if (!isObjectRecord(frame)) {
    return null;
  }

  if (frame.type === 'observer_snapshot') {
    return phaseValue(frame.current_phase);
  }

  if (frame.type === 'turn.started' || frame.type === 'turn.completed') {
    return phaseValue(frame.phase);
  }

  return null;
}

export function isTerminalLessonObserverFrame(frame: unknown): boolean {
  if (!isObjectRecord(frame)) {
    return false;
  }

  const assignmentState = frame.state ?? frame.current_state;
  if (assignmentState === 'COMPLETED' || assignmentState === 'FAILED' || assignmentState === 'CANCELLED') {
    return true;
  }

  return frame.type === 'session.end' || frame.type === 'safety.halt';
}

export function checkpointFromCurrentAssignment(
  assignment: CurrentAssignmentCheckpointInput | null | undefined,
  deviceId: string | null | undefined,
  observerPhase?: LessonPhase | null,
): LessonCheckpoint | null {
  if (!assignment || !isNonEmptyString(deviceId)) {
    return null;
  }

  const phase = observerPhase ?? lessonPhaseForAssignmentState(assignment.state);
  if (
    !phase ||
    !isNonEmptyString(assignment.assignmentId) ||
    !isNonEmptyString(assignment.lessonTitle) ||
    !isNonEmptyString(assignment.childId) ||
    !(assignment.sessionId === null || isOptionalNonEmptyString(assignment.sessionId)) ||
    !isOptionalFiniteNumber(assignment.assignmentVersion) ||
    !isOptionalChecksum(assignment.manifestChecksum)
  ) {
    return null;
  }

  return {
    version: 1,
    lessonTitle: assignment.lessonTitle,
    progressLabel: 'Lesson in progress',
    resumeTarget: ROUTES.RunningScreen,
    reason: 'network',
    phase,
    sessionState: 'active',
    authState: 'authenticated',
    deviceId,
    assignmentId: assignment.assignmentId,
    childId: assignment.childId,
    ...(assignment.sessionId === undefined || assignment.sessionId === null
      ? {}
      : { sessionId: assignment.sessionId }),
    ...(assignment.assignmentVersion === undefined
      ? {}
      : { assignmentVersion: assignment.assignmentVersion }),
    ...(assignment.manifestChecksum === undefined
      ? {}
      : { manifestChecksum: assignment.manifestChecksum }),
  };
}

export function parseLessonCheckpoint(input: unknown): LessonCheckpoint | null {
  const value = input;
  if (!isObjectRecord(value)) {
    return null;
  }

  if (!(
    value.version === 1 &&
    isNonEmptyString(value.lessonTitle) &&
    isNonEmptyString(value.progressLabel) &&
    isResumeTarget(value.resumeTarget) &&
    isRecoveryReason(value.reason) &&
    isLessonPhase(value.phase) &&
    isSessionState(value.sessionState) &&
    isAuthState(value.authState) &&
    isNonEmptyString(value.deviceId) &&
    isNonEmptyString(value.assignmentId) &&
    isOptionalNonEmptyString(value.sessionId) &&
    isOptionalNonEmptyString(value.activityLabel) &&
    isOptionalNonEmptyString(value.elapsedLabel) &&
    isOptionalNonEmptyString(value.courseId) &&
    isOptionalNonEmptyString(value.childId) &&
    isOptionalFiniteNumber(value.assignmentVersion) &&
    isOptionalChecksum(value.manifestChecksum)
  )) {
    return null;
  }

  return {
    version: 1,
    lessonTitle: value.lessonTitle,
    progressLabel: value.progressLabel,
    resumeTarget: value.resumeTarget,
    reason: value.reason,
    phase: value.phase,
    sessionState: value.sessionState,
    authState: value.authState,
    deviceId: value.deviceId,
    assignmentId: value.assignmentId,
    ...(value.sessionId === undefined ? {} : { sessionId: value.sessionId }),
    ...(value.activityLabel === undefined ? {} : { activityLabel: value.activityLabel }),
    ...(value.elapsedLabel === undefined ? {} : { elapsedLabel: value.elapsedLabel }),
    ...(value.courseId === undefined ? {} : { courseId: value.courseId }),
    ...(value.childId === undefined ? {} : { childId: value.childId }),
    ...(value.assignmentVersion === undefined ? {} : { assignmentVersion: value.assignmentVersion }),
    ...(value.manifestChecksum === undefined ? {} : { manifestChecksum: value.manifestChecksum }),
  };
}

export function decideLessonRecovery(input: unknown): RecoveryDecision {
  const checkpoint = parseLessonCheckpoint(input);
  if (!checkpoint) {
    return { kind: 'ended', reason: 'invalid_checkpoint' };
  }

  if (checkpoint.phase === 'done') {
    return { kind: 'ended', reason: 'done' };
  }

  if (checkpoint.sessionState === 'terminated') {
    return { kind: 'ended', reason: 'terminated' };
  }

  if (checkpoint.sessionState === 'expired') {
    return { kind: 'ended', reason: 'expired' };
  }

  if (checkpoint.authState === 'expired') {
    return { kind: 'reauth', checkpoint };
  }

  return { kind: 'resume', checkpoint };
}

export function recoveryScreenForReason(reason: RecoveryReason): RecoveryScreen {
  switch (reason) {
    case 'network':
      return ROUTES.NetworkErrorScreen;
    case 'voice_failed':
      return ROUTES.VoiceFailedScreen;
    case 'mic_missing':
      return ROUTES.MicMissingScreen;
    case 'audio_route_changed':
      return ROUTES.AudioRecoveryScreen;
    case 'audio_recovered':
      return ROUTES.LessonResumeScreen;
    case 'safety':
      return ROUTES.SafetyRedirectScreen;
    case 'app_error':
      return ROUTES.AppErrorScreen;
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

export function fallbackCheckpoint(): LessonCheckpoint {
  return {
    version: 1,
    lessonTitle: 'How are you?',
    progressLabel: '60%',
    resumeTarget: ROUTES.RunningScreen,
    reason: 'voice_failed',
    phase: 'speaking',
    sessionState: 'active',
    authState: 'authenticated',
    activityLabel: 'Speaking practice',
    deviceId: 'device-1',
    assignmentId: 'assignment-1',
  };
}
