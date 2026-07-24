import client from '@/services/http/client';
import {
  getDailyState,
  getHomeHub,
  HOME_BACKEND_CONTRACT_AVAILABLE,
} from '@/services/api/home.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('mobile Home backend contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables the implemented backend contract and returns the live hub response', async () => {
    const hub = {
      variant: 'empty' as const,
      children: [{ id: 'child-1', name: 'Minh', streakDays: 0, lastSessionDate: null }],
      selectedChildId: 'child-1',
      childName: 'Minh',
      streakDays: 0,
      todayMinutes: 0,
      lessonsCompletedToday: 0,
      wordsLearnedThisWeek: 0,
      nextLessonId: null,
      nextLesson: null,
    };
    mockedClient.get.mockResolvedValueOnce({ data: hub });

    await expect(getHomeHub()).resolves.toEqual(hub);
    expect(HOME_BACKEND_CONTRACT_AVAILABLE).toBe(true);
    expect(mockedClient.get).toHaveBeenCalledWith('/home/hub', { params: undefined });
  });

  it('sends the selected child using the backend snake-case query contract', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { variant: 'daily_available' } });

    await getHomeHub('child-1');

    expect(mockedClient.get).toHaveBeenCalledWith('/home/hub', {
      params: { child_id: 'child-1' },
    });
  });

  it('requests daily progress with optional child and date filters', async () => {
    const daily = {
      date: '2026-07-22',
      childId: 'child-1',
      completed: false,
      minutesGoal: 5,
      minutesDone: 2,
    };
    mockedClient.get.mockResolvedValueOnce({ data: daily });

    await expect(getDailyState('child-1', '2026-07-22')).resolves.toEqual(daily);
    expect(mockedClient.get).toHaveBeenCalledWith('/home/daily', {
      params: { child_id: 'child-1', date: '2026-07-22' },
    });
  });
});
