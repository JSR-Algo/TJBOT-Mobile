import {
  FEATURE_LESSON_SESSION,
  FeatureLessonSessionDisabledError,
} from '@/config/feature-flags';

export interface SessionStartParams {
  lessonId: string;
  childId: string;
}

export interface Session {
  id: string;
  lessonId: string;
  startedAt: string;
}

export interface UtteranceParams {
  sessionId: string;
  audioBase64: string;
}

export interface Activity {
  id: string;
  type: string;
  prompt: string;
}

export interface SafetyEvent {
  sessionId: string;
  kind: string;
  utterance: string;
}

export async function startSession(_params: SessionStartParams): Promise<Session> {
  if (!FEATURE_LESSON_SESSION) {
    throw new FeatureLessonSessionDisabledError('startSession');
  }
  throw new Error('not implemented');
}

export async function endSession(_sessionId: string): Promise<void> {
  if (!FEATURE_LESSON_SESSION) {
    throw new FeatureLessonSessionDisabledError('endSession');
  }
  throw new Error('not implemented');
}

export async function sendUtterance(_params: UtteranceParams): Promise<{ response: string }> {
  if (!FEATURE_LESSON_SESSION) {
    throw new FeatureLessonSessionDisabledError('sendUtterance');
  }
  throw new Error('not implemented');
}

export async function getActivityList(_sessionId: string): Promise<Activity[]> {
  if (!FEATURE_LESSON_SESSION) {
    throw new FeatureLessonSessionDisabledError('getActivityList');
  }
  throw new Error('not implemented');
}

export async function reportSafetyEvent(_event: SafetyEvent): Promise<void> {
  if (!FEATURE_LESSON_SESSION) {
    throw new FeatureLessonSessionDisabledError('reportSafetyEvent');
  }
  throw new Error('not implemented');
}
