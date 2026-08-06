import { ROUTES } from '@/navigation/routes';
import {
  decideLessonRecovery,
  fallbackCheckpoint,
  recoveryScreenForReason,
  type LessonCheckpoint,
  type LessonPhase,
  type RecoveryReason,
} from '@/features/fallback/recoveryTypes';

const phases: readonly LessonPhase[] = ['connecting', 'greeting', 'listening', 'speaking', 'done'];

function activeCheckpoint(phase: LessonPhase): LessonCheckpoint {
  return {
    lessonTitle: 'Greetings',
    progressLabel: '2 of 5',
    resumeTarget: ROUTES.SendToRobotScreen,
    reason: 'voice_failed',
    phase,
    sessionState: 'active',
    authState: 'authenticated',
  };
}

describe('mobile lesson recovery decision matrix', () => {
  it('resumes active authenticated checkpoints for every non-terminal lesson phase', () => {
    for (const phase of phases.filter((value) => value !== 'done')) {
      const checkpoint = activeCheckpoint(phase);

      expect(decideLessonRecovery(checkpoint)).toEqual({
        kind: 'resume',
        checkpoint,
      });
    }
  });

  it('ends done checkpoints instead of resuming', () => {
    expect(decideLessonRecovery(activeCheckpoint('done'))).toEqual({
      kind: 'ended',
      reason: 'done',
    });
  });

  it('treats terminated and expired sessions as terminal invariants', () => {
    expect(decideLessonRecovery({ ...activeCheckpoint('speaking'), sessionState: 'terminated' })).toEqual({
      kind: 'ended',
      reason: 'terminated',
    });
    expect(decideLessonRecovery({ ...activeCheckpoint('listening'), sessionState: 'expired' })).toEqual({
      kind: 'ended',
      reason: 'expired',
    });
  });

  it('requires reauth for an otherwise active checkpoint and resumes after authenticated reevaluation', () => {
    const checkpoint = { ...activeCheckpoint('listening'), authState: 'expired' } satisfies LessonCheckpoint;

    expect(decideLessonRecovery(checkpoint)).toEqual({
      kind: 'reauth',
      checkpoint,
    });
    expect(decideLessonRecovery({ ...checkpoint, authState: 'authenticated' })).toMatchObject({
      kind: 'resume',
    });
  });

  it('fails closed for missing, malformed, or partial checkpoint objects', () => {
    const invalidObjects: readonly unknown[] = [
      null,
      undefined,
      'checkpoint',
      {},
      { ...activeCheckpoint('speaking'), lessonTitle: '' },
      { ...activeCheckpoint('speaking'), progressLabel: '   ' },
      { ...activeCheckpoint('speaking'), resumeTarget: ROUTES.LoginScreen },
      { ...activeCheckpoint('speaking'), reason: 'robot_offline' },
      { ...activeCheckpoint('speaking'), phase: 'thinking' },
      { ...activeCheckpoint('speaking'), sessionState: 'paused' },
      { ...activeCheckpoint('speaking'), authState: 'anonymous' },
      { lessonTitle: 'Missing everything else' },
    ];

    for (const input of invalidObjects) {
      expect(decideLessonRecovery(input)).toEqual({
        kind: 'ended',
        reason: 'invalid_checkpoint',
      });
    }
  });

  it('maps every recovery reason to its recovery screen', () => {
    const expectations: Readonly<Record<RecoveryReason, string>> = {
      network: ROUTES.NetworkErrorScreen,
      voice_failed: ROUTES.VoiceFailedScreen,
      mic_missing: ROUTES.MicMissingScreen,
      audio_route_changed: ROUTES.AudioRecoveryScreen,
      audio_recovered: ROUTES.LessonResumeScreen,
      safety: ROUTES.SafetyRedirectScreen,
      app_error: ROUTES.AppErrorScreen,
    };

    for (const [reason, screen] of Object.entries(expectations) as Array<[RecoveryReason, string]>) {
      expect(recoveryScreenForReason(reason)).toBe(screen);
    }
  });

  it('provides a complete active speaking fallback checkpoint', () => {
    expect(decideLessonRecovery(fallbackCheckpoint())).toMatchObject({
      kind: 'resume',
      checkpoint: {
        phase: 'speaking',
        sessionState: 'active',
        authState: 'authenticated',
      },
    });
  });
});
