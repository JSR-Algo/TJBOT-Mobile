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
  throw new Error('not implemented');
}

export async function getDailyState(): Promise<DailyState> {
  throw new Error('not implemented');
}
