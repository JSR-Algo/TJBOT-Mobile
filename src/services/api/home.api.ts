import client from '@/services/http/client';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import {
  INVESTOR_DEMO_ASSIGNMENTS,
  INVESTOR_DEMO_CHILD,
  INVESTOR_DEMO_LIBRARY,
} from '@/demo/investorDemoSeed';

export const HOME_BACKEND_CONTRACT_AVAILABLE = true as const;

export interface HomeChild {
  id: string;
  name: string;
  streakDays: number;
  lastSessionDate: string | null;
}

export interface HomeLesson {
  id: string;
  title: string;
  durationMinutes: number | null;
  focusItems: string[];
  totalSteps: number;
  state: string;
}

export interface HomeHub {
  childName: string | null;
  streakDays: number;
  todayMinutes: number;
  lessonsCompletedToday: number;
  wordsLearnedThisWeek: number;
  nextLessonId: string | null;
  nextLesson: HomeLesson | null;
  variant: 'zero_child' | 'multiple_children' | 'empty' | 'daily_available' | 'completed_today' | 'streak_lost';
  children: HomeChild[];
  selectedChildId: string | null;
}

export interface DailyState {
  date: string;
  childId: string | null;
  completed: boolean;
  minutesGoal: number;
  minutesDone: number;
}

export async function getHomeHub(childId?: string): Promise<HomeHub> {
  if (isInvestorDemoEnabled()) return investorDemoHomeHub();
  const response = await client.get<HomeHub>('/home/hub', {
    params: childId ? { child_id: childId } : undefined,
  });
  return response.data;
}

function investorDemoHomeHub(): HomeHub {
  const lesson = INVESTOR_DEMO_ASSIGNMENTS[0];
  const course = INVESTOR_DEMO_LIBRARY[0]!;

  return {
    childName: INVESTOR_DEMO_CHILD.name,
    streakDays: 4,
    todayMinutes: 0,
    lessonsCompletedToday: 1,
    wordsLearnedThisWeek: 3,
    nextLessonId: lesson?.lessonId ?? 'demo-barn-animals',
    nextLesson: {
      id: lesson?.lessonId ?? 'demo-barn-animals',
      title: course.title,
      durationMinutes: 7,
      focusItems: ['cow', 'barn', 'horse', 'sheep', 'farm', 'field'],
      totalSteps: 4,
      state: lesson?.state ?? 'READY',
    },
    variant: 'daily_available',
    children: [{
      id: INVESTOR_DEMO_CHILD.id,
      name: INVESTOR_DEMO_CHILD.name,
      streakDays: 4,
      lastSessionDate: '2026-06-22',
    }],
    selectedChildId: INVESTOR_DEMO_CHILD.id,
  };
}

export async function getDailyState(childId?: string, date?: string): Promise<DailyState> {
  const response = await client.get<DailyState>('/home/daily', {
    params: {
      ...(childId ? { child_id: childId } : {}),
      ...(date ? { date } : {}),
    },
  });
  return response.data;
}
