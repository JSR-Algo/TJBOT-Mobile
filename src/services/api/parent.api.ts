import client from '../http/client';

export const BACKEND_CONTRACT_UNAVAILABLE_CODE = 'BACKEND_CONTRACT_UNAVAILABLE' as const;

export class BackendContractUnavailableError extends Error {
  readonly code = BACKEND_CONTRACT_UNAVAILABLE_CODE;
  constructor(operation: string) {
    super(`BACKEND_CONTRACT_UNAVAILABLE: ${operation} has no documented backend contract`);
    this.name = 'BackendContractUnavailableError';
  }
}

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

interface RawParentToday {
  date?: string;
  minutes_done?: number;
  minutesDone?: number;
  lessons_completed?: number;
  lessonsCompleted?: number;
  current_streak?: number;
  currentStreak?: number;
  highlights?: Array<{
    type?: string;
    value?: string;
  }>;
}

interface RawParentHistoryEntry {
  date: string;
  minutes?: number;
  lessons?: number;
  lessons_completed?: number;
  lessonsCompleted?: number;
}

interface RawParentHistory {
  daily?: RawParentHistoryEntry[];
  totals?: {
    minutes?: number;
    lessons_completed?: number;
    lessonsCompleted?: number;
  };
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

function mapParentToday(raw: RawParentToday): ParentToday {
  return {
    date: raw.date ?? '',
    minutesDone: raw.minutes_done ?? raw.minutesDone ?? 0,
    lessonsCompleted: raw.lessons_completed ?? raw.lessonsCompleted ?? 0,
  };
}

function mapParentHistoryEntry(raw: RawParentHistoryEntry): ParentHistoryEntry {
  return {
    date: raw.date,
    minutes: raw.minutes ?? 0,
    lessons: raw.lessons ?? raw.lessons_completed ?? raw.lessonsCompleted ?? 0,
  };
}

export async function getParentSummary(): Promise<ParentSummary> {
  const [todayResponse, historyResponse] = await Promise.all([
    client.get('/parent/today'),
    client.get('/parent/history'),
  ]);
  const today = unwrap<RawParentToday>(todayResponse);
  const history = unwrap<RawParentHistory>(historyResponse);
  const highlights = Array.isArray(today.highlights) ? today.highlights : [];

  return {
    weekMinutes: Number(history.totals?.minutes ?? 0),
    weekLessons: Number(
      history.totals?.lessons_completed
      ?? history.totals?.lessonsCompleted
      ?? 0,
    ),
    streak: Number(today.current_streak ?? today.currentStreak ?? 0),
    topWords: highlights
      .filter((highlight) => highlight.type === 'word' && typeof highlight.value === 'string')
      .map((highlight) => highlight.value as string),
  };
}

export async function getParentToday(): Promise<ParentToday> {
  const response = await client.get('/parent/today');
  return mapParentToday(unwrap<RawParentToday>(response));
}

export async function getParentHistory(): Promise<ParentHistoryEntry[]> {
  const response = await client.get('/parent/history');
  const history = unwrap<RawParentHistory>(response);
  const daily = Array.isArray(history.daily) ? history.daily : [];
  return daily.map(mapParentHistoryEntry);
}

export async function getSafetyConfig(): Promise<SafetyConfig> {
  throw new Error('not implemented');
}

export async function updateSafetyConfig(_config: Partial<SafetyConfig>): Promise<void> {
  throw new Error('not implemented');
}

export async function getSettings(): Promise<ParentSettings> {
  throw new Error('not implemented');
}

export async function updateSettings(_settings: Partial<ParentSettings>): Promise<void> {
  throw new Error('not implemented');
}
