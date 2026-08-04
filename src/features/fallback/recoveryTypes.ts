import { ROUTES } from '@/navigation/routes';

export type RecoveryReason =
  | 'network'
  | 'voice_failed'
  | 'mic_missing'
  | 'audio_recovered'
  | 'safety'
  | 'app_error';

export type ResumeTarget =
  | typeof ROUTES.SendToRobotScreen
  | typeof ROUTES.HomeHubScreen;

export type LessonCheckpoint = {
  readonly lessonTitle: string;
  readonly progressLabel: string;
  readonly resumeTarget: ResumeTarget;
  readonly reason: RecoveryReason;
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

export function fallbackCheckpoint(): LessonCheckpoint {
  return {
    lessonTitle: 'How are you?',
    progressLabel: '60%',
    resumeTarget: ROUTES.SendToRobotScreen,
    reason: 'voice_failed',
    activityLabel: 'Speaking practice',
  };
}
