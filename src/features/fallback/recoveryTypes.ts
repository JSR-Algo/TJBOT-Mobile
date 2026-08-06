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
  | typeof ROUTES.SendToRobotScreen
  | typeof ROUTES.HomeHubScreen;

export type LessonPhase = 'connecting' | 'greeting' | 'listening' | 'speaking' | 'done';

export type RecoverySessionState = 'active' | 'terminated' | 'expired';

export type RecoveryAuthState = 'authenticated' | 'expired';

export type LessonCheckpoint = {
  readonly lessonTitle: string;
  readonly progressLabel: string;
  readonly resumeTarget: ResumeTarget;
  readonly reason: RecoveryReason;
  readonly phase?: LessonPhase;
  readonly sessionState?: RecoverySessionState;
  readonly authState?: RecoveryAuthState;
  readonly activityLabel?: string;
  readonly elapsedLabel?: string;
  readonly courseId?: string;
  readonly childId?: string;
  readonly deviceId?: string;
  readonly assignmentId?: string;
  readonly assignmentVersion?: number;
  readonly manifestChecksum?: string | null;
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
  | typeof ROUTES.AudioRecoveryScreen
  | typeof ROUTES.LessonResumeScreen
  | typeof ROUTES.SafetyRedirectScreen
  | typeof ROUTES.AppErrorScreen;

const recoveryReasons = new Set<RecoveryReason>([
  'network',
  'voice_failed',
  'mic_missing',
  'audio_route_changed',
  'audio_recovered',
  'safety',
  'app_error',
]);

const resumeTargets = new Set<ResumeTarget>([
  ROUTES.SendToRobotScreen,
  ROUTES.HomeHubScreen,
]);

const lessonPhases = new Set<LessonPhase>([
  'connecting',
  'greeting',
  'listening',
  'speaking',
  'done',
]);

const sessionStates = new Set<RecoverySessionState>([
  'active',
  'terminated',
  'expired',
]);

const authStates = new Set<RecoveryAuthState>([
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
  return typeof value === 'string' && recoveryReasons.has(value as RecoveryReason);
}

function isResumeTarget(value: unknown): value is ResumeTarget {
  return typeof value === 'string' && resumeTargets.has(value as ResumeTarget);
}

function isLessonPhase(value: unknown): value is LessonPhase {
  return typeof value === 'string' && lessonPhases.has(value as LessonPhase);
}

function isSessionState(value: unknown): value is RecoverySessionState {
  return typeof value === 'string' && sessionStates.has(value as RecoverySessionState);
}

function isAuthState(value: unknown): value is RecoveryAuthState {
  return typeof value === 'string' && authStates.has(value as RecoveryAuthState);
}

function isCompleteCheckpoint(value: unknown): value is LessonCheckpoint & {
  readonly phase: LessonPhase;
  readonly sessionState: RecoverySessionState;
  readonly authState: RecoveryAuthState;
} {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.lessonTitle) &&
    isNonEmptyString(value.progressLabel) &&
    isResumeTarget(value.resumeTarget) &&
    isRecoveryReason(value.reason) &&
    isLessonPhase(value.phase) &&
    isSessionState(value.sessionState) &&
    isAuthState(value.authState)
  );
}

export function decideLessonRecovery(input: unknown): RecoveryDecision {
  if (!isCompleteCheckpoint(input)) {
    return { kind: 'ended', reason: 'invalid_checkpoint' };
  }

  if (input.phase === 'done') {
    return { kind: 'ended', reason: 'done' };
  }

  if (input.sessionState === 'terminated') {
    return { kind: 'ended', reason: 'terminated' };
  }

  if (input.sessionState === 'expired') {
    return { kind: 'ended', reason: 'expired' };
  }

  if (input.authState === 'expired') {
    return { kind: 'reauth', checkpoint: input };
  }

  return { kind: 'resume', checkpoint: input };
}

export function recoveryScreenForReason(reason: RecoveryReason): RecoveryScreen {
  switch (reason) {
    case 'network':
      return ROUTES.NetworkErrorScreen;
    case 'voice_failed':
      return ROUTES.VoiceFailedScreen;
    case 'mic_missing':
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
    lessonTitle: 'How are you?',
    progressLabel: '60%',
    resumeTarget: ROUTES.SendToRobotScreen,
    reason: 'voice_failed',
    phase: 'speaking',
    sessionState: 'active',
    authState: 'authenticated',
    activityLabel: 'Speaking practice',
  };
}
