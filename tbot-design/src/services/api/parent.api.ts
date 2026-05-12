export interface ParentSummary {
  weekMinutes: number;
  weekLessons: number;
  streak: number;
  topWords: string[];
}

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

export async function getParentSummary(): Promise<ParentSummary> {
  throw new Error('not implemented');
}

export async function getParentToday(): Promise<ParentToday> {
  throw new Error('not implemented');
}

export async function getParentHistory(): Promise<ParentHistoryEntry[]> {
  throw new Error('not implemented');
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
