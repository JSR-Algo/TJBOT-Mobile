import { backendContractUnavailable } from './undocumented-api-routes';

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
  backendContractUnavailable(`startSession:${_params.lessonId}:${_params.childId}`);
}

export async function endSession(_sessionId: string): Promise<void> {
  backendContractUnavailable(`endSession:${_sessionId}`);
}

export async function sendUtterance(_params: UtteranceParams): Promise<{ response: string }> {
  backendContractUnavailable(`sendUtterance:${_params.sessionId}`);
}

export async function getActivityList(_sessionId: string): Promise<Activity[]> {
  backendContractUnavailable(`getActivityList:${_sessionId}`);
}

export async function reportSafetyEvent(_event: SafetyEvent): Promise<void> {
  backendContractUnavailable(`reportSafetyEvent:${_event.sessionId}:${_event.kind}`);
}
