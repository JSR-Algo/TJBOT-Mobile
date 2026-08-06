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

import { backendContractUnavailable } from './undocumented-api-routes';

export async function getHomeHub(): Promise<HomeHub> {
  backendContractUnavailable('getHomeHub');
}

export async function getDailyState(): Promise<DailyState> {
  backendContractUnavailable('getDailyState');
}
