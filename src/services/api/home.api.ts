import {
  FEATURE_HOME_HUB,
  FeatureHomeHubDisabledError,
} from '@/config/feature-flags';

export const HOME_BACKEND_CONTRACT_AVAILABLE = false as const;

export interface HomeHub {
  childName: string;
  streakDays: number;
  todayMinutes: number;
  nextLessonId: string | null;
  variant?: string;
}

export interface DailyState {
  date: string;
  completed: boolean;
  minutesGoal: number;
  minutesDone: number;
}

export async function getHomeHub(): Promise<HomeHub> {
  if (!FEATURE_HOME_HUB) {
    throw new FeatureHomeHubDisabledError('getHomeHub');
  }
  throw new Error('not implemented');
}

export async function getDailyState(): Promise<DailyState> {
  if (!FEATURE_HOME_HUB) {
    throw new FeatureHomeHubDisabledError('getDailyState');
  }
  throw new Error('not implemented');
}
