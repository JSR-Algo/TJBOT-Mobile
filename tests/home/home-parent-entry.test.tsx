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
  it('shows the approved Today command actions', () => {
    const navigation = { navigate: jest.fn() };

    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{} as never} />,
    );

    expect(screen.getByText('Ready when Mai is')).toBeTruthy();
    expect(screen.getByText('Barn & Farm Words')).toBeTruthy();
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByText('Living room TeeBot · Online')).toBeTruthy();

    fireEvent.press(screen.getByTestId('homePrimaryCta'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
  });

  it('opens the live robot lesson status from the hero', () => {
    const navigation = { navigate: jest.fn() };

    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{} as never} />,
    );

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, {
      lessonTitle: 'Barn & Farm Words',
    });
  });
});
