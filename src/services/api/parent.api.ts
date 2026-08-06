import client from '../http/client';
import { backendContractUnavailable } from './undocumented-api-routes';

// Re-exported, not redefined — see the note in purchase.api.ts. One class, one
// shape, so `instanceof` holds across module boundaries.
export {
  BACKEND_CONTRACT_UNAVAILABLE_CODE,
  BackendContractUnavailableError,
} from './undocumented-api-routes';

function unwrap<T>(response: { data: { data?: T } | T }): T {
  const body = response.data as { data?: T } & T;
  return (body && typeof body === 'object' && 'data' in body && body.data !== undefined ? body.data : body) as T;
}

export interface ParentAuthResult {
  authenticated: boolean;
  authenticated_at?: string;
}

export interface ClearLockoutResult {
  cleared: boolean;
}

export async function authenticateParent(params: { pin: string }): Promise<ParentAuthResult> {
  const response = await client.post('/parent/auth', { pin: params.pin });
  return unwrap<ParentAuthResult>(response);
}

export async function clearParentLockout(params: { targetUserId: string; reason?: string }): Promise<ClearLockoutResult> {
  const response = await client.post('/parent/lockout/clear', {
    target_user_id: params.targetUserId,
    reason: params.reason ?? 'mobile_parent_recovery',
  });
  return unwrap<ClearLockoutResult>(response);
}

export interface ParentSummary {
  weekMinutes: number;
  weekLessons: number;
  streak: number;
  topWords: string[];
}

export const EMPTY_PARENT_SUMMARY: ParentSummary = Object.freeze({
  weekMinutes: 0,
  weekLessons: 0,
  streak: 0,
  topWords: [],
});

export interface ParentToday {
  date: string;
  minutesDone: number;
  lessonsCompleted: number;
}

export interface ParentHistoryEntry {
  date: string;
  minutes: number;
  lessons: number;
}

export interface SafetyConfig {
  maxDailyMinutes: number;
  allowWeekends: boolean;
  blockKeywords: string[];
}

export interface ParentSettings {
  notificationsEnabled: boolean;
  reportFrequency: 'daily' | 'weekly';
  language: string;
}

// The RawParentToday/RawParentHistoryEntry wire types and their mappers went
// with the calls: they described a `/v1/parent/today` and `/v1/parent/history`
// payload that no controller has ever produced. The ParentToday and
// ParentHistoryEntry domain types stay — they are the shape a future contract
// would have to satisfy, and callers still reference them.

export async function getParentSummary(): Promise<ParentSummary> {
  // The backend parent-summary contract is not designed yet. Keep the parent
  // profile usable without inventing child activity data.
  return { ...EMPTY_PARENT_SUMMARY, topWords: [...EMPTY_PARENT_SUMMARY.topWords] };
}

export async function getParentToday(): Promise<ParentToday> {
  backendContractUnavailable('getParentToday');
}

export async function getParentHistory(): Promise<ParentHistoryEntry[]> {
  backendContractUnavailable('getParentHistory');
}

// These four used to reject with a bare `new Error('not implemented')`, which
// carries no `code` and so normalizes to UNKNOWN_ERROR — indistinguishable from
// a genuine server fault. They fail on the same typed sentinel as every other
// uncontracted operation now.
export async function getSafetyConfig(): Promise<SafetyConfig> {
  backendContractUnavailable('getSafetyConfig');
}

export async function updateSafetyConfig(_config: Partial<SafetyConfig>): Promise<void> {
  backendContractUnavailable('updateSafetyConfig');
}

export async function getSettings(): Promise<ParentSettings> {
  backendContractUnavailable('getSettings');
}

export async function updateSettings(_settings: Partial<ParentSettings>): Promise<void> {
  backendContractUnavailable('updateSettings');
}
