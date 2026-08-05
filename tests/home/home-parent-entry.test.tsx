import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import HomeHubScreen from '@/features/home/screens/HomeHubScreen';

jest.mock('@/features/home/hooks/useHomeState', () => {
  const { ROUTES: ROUTE_VALUES } = jest.requireActual('@/navigation/routes');
  return {
    useHomeState: () => ({
      isLoading: false,
      variant: 'daily_available',
      contentMode: 'live',
      data: {
        variant: 'daily_available',
        childName: 'Mai',
        nextLesson: {
          id: 'farm-words',
          title: 'Barn & Farm Words',
          durationMinutes: 7,
          focusItems: ['cow', 'barn', 'horse', 'sheep'],
          totalSteps: 6,
          state: 'READY',
        },
      },
      cfg: {
        emotion: 'happy',
        accent: '#FF6F61',
        chip: { text: "Today's lesson is ready!", color: '#FF6F61' },
        ctaLabel: "Start Today's Lesson",
        ctaIcon: '▶',
        ctaColor: '#FF6F61',
        ctaTarget: ROUTE_VALUES.LessonReadyScreen,
        ctaEnabled: true,
        reviewBadge: null,
        courseBadge: null,
        dimSecondary: false,
        forceGreet: false,
        quickActions: [],
      },
    }),
  };
});

describe('HomeHubScreen command center', () => {
  it('shows the approved progress-first Home composition', () => {
    const navigation = { navigate: jest.fn() };

    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{} as never} />,
    );

    expect(screen.getByText('Ready when Mai is')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.queryByText('Barn & Farm Words')).toBeNull();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.getByTestId('homeHeroRobotAnimation')).toBeTruthy();

    fireEvent.press(screen.getByTestId('homeProgressCard'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.TodayProgressScreen);
  });

  it('keeps the Robot hero presentational instead of opening phone Live', () => {
    const navigation = { navigate: jest.fn() };

    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{} as never} />,
    );

    expect(screen.getByTestId('homeHeroRobot')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
