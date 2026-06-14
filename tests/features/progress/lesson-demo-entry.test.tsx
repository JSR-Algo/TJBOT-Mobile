import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';
import { ROUTES } from '@/navigation/routes';
import { getProgressSummary } from '@/services/api/progress.api';

jest.mock('@/services/api/progress.api', () => ({
  getProgressSummary: jest.fn(),
}));

const navigation = {
  navigate: jest.fn(),
} as any;

const route = {
  name: 'TodayProgressScreen',
  key: 'today-progress',
} as any;

describe('lesson demo entry from progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProgressSummary as jest.Mock).mockResolvedValue({
      minutesDone: 8,
      minutesGoal: 10,
      lessonsCompleted: 1,
      speakingTurns: 8,
      starsToday: 2,
      streakDays: 3,
      reviewDueCount: 0,
      words: ['hello'],
      weeklyBars: [0.2, 0.4, 0.3, 0.8, 0, 0, 0],
    });
  });

  it('opens the static lesson path and live lesson planner from the progress tab', async () => {
    const { getByText } = render(<TodayProgressScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(getByText('Open lesson demo')).toBeTruthy());
    fireEvent.press(getByText('Open lesson demo'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonDemoHomeScreen);

    fireEvent.press(getByText("View today's lesson"));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonPlannerScreen);
  });
});
