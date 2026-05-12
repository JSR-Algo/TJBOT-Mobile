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
  throw new Error('not implemented');
}

export async function endSession(_sessionId: string): Promise<void> {
  throw new Error('not implemented');
}

export async function sendUtterance(_params: UtteranceParams): Promise<{ response: string }> {
  throw new Error('not implemented');
}

export async function getActivityList(_sessionId: string): Promise<Activity[]> {
  throw new Error('not implemented');
}

export async function reportSafetyEvent(_event: SafetyEvent): Promise<void> {
  throw new Error('not implemented');
}
