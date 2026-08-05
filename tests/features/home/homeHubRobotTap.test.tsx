import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HomeHubScreen from '../../../src/features/home/screens/HomeHubScreen';
import { ROUTES } from '../../../src/navigation/routes';

jest.mock('../../../src/features/home/hooks/useHomeState', () => ({
  useHomeState: () => ({
    variant: 'daily_available',
    isLoading: false,
    contentMode: 'live',
    data: {
      nextLessonId: 'w01-d01-barn-say-it',
      nextLesson: {
        id: 'w01-d01-barn-say-it',
        title: 'Barn & Farm Words',
        durationMinutes: 7,
        focusItems: ['cow', 'barn', 'horse', 'sheep'],
      },
      streakDays: 4,
      todayMinutes: 8,
    },
    cfg: {
      chip: null,
      forceGreet: false,
      ctaLabel: 'Start lesson',
      ctaTarget: 'LessonReadyScreen',
      ctaColor: '#FF6B6F',
      ctaEnabled: true,
      dimSecondary: false,
      reviewBadge: undefined,
    },
  }),
}));

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('HomeHub progress entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens progress from the coral overview card', () => {
    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{ key: 'home', name: ROUTES.HomeHubScreen }} />,
    );

    fireEvent.press(screen.getByTestId('homeProgressCard'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.TodayProgressScreen);
  });

  it('renders the Today command center without the legacy garden dashboard', () => {
    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{ key: 'home', name: ROUTES.HomeHubScreen }} />,
    );

    expect(screen.getByTestId('overviewPage')).toBeTruthy();
    expect(screen.getByTestId('homeHeroAnimatedRobot')).toBeTruthy();
    expect(screen.getByTestId('homeHeroRobotAnimation')).toBeTruthy();
    expect(screen.getByText('Ready when Mia is')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.queryByText('Barn & Farm Words')).toBeNull();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.getByText('Since yesterday')).toBeTruthy();
    expect(screen.queryByText('My Garden')).toBeNull();
  });
});
