import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import { deriveHomeState } from '@/features/home/hooks/useHomeState';
import LessonDetailScreen from '@/features/course/screens/LessonDetailScreen';
import ReviewEntryScreen from '@/features/course/screens/ReviewEntryScreen';
import DailyMissionScreen from '@/features/course/screens/DailyMissionScreen';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import ReviewNeededScreen from '@/features/progress/screens/ReviewNeededScreen';
import FirstLessonEntryScreen from '@/features/onboarding/screens/FirstLessonEntryScreen';
import ConnectingScreen from '@/features/lesson-session/screens/ConnectingScreen';
import ThinkingScreen from '@/features/lesson-session/screens/ThinkingScreen';
import LessonDoneScreen from '@/features/lesson-session/screens/LessonDoneScreen';

jest.mock('@/contexts/HouseholdContext', () => {
  const actual = jest.requireActual('@/contexts/HouseholdContext');
  return { ...actual, useHousehold: () => ({ activeHousehold: { id: 'house-1' } }), useOptionalHousehold: jest.fn() };
});
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useRewardInboxQuery: () => ({ data: { rewards: [], count: 0 }, isError: false, refetch: jest.fn() }),
}));

import { useOptionalHousehold } from '@/contexts/HouseholdContext';

const mockedUseOptionalHousehold = useOptionalHousehold as jest.MockedFunction<
  typeof useOptionalHousehold
>;

function navigationFor() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

function routeFor(name: keyof typeof ROUTES, params?: object) {
  return { key: `${name}-key`, name: ROUTES[name], params } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseOptionalHousehold.mockReturnValue(undefined);
});

describe('lesson production readiness entry points', () => {
  it('routes home lesson-ready states to the real robot assignment flow', () => {
    const child = [{ id: 'child-1', name: 'Mina' }];

    const idle = deriveHomeState({
      children: child,
      selectedChildId: 'child-1',
      hub: { childName: 'Mina', streakDays: 0, todayMinutes: 0, nextLessonId: null },
    });
    const daily = deriveHomeState({
      children: child,
      selectedChildId: 'child-1',
      hub: { childName: 'Mina', streakDays: 0, todayMinutes: 0, nextLessonId: 'lesson-1' },
    });

    expect(idle.cfg.ctaTarget).toBe(ROUTES.SendToRobotScreen);
    expect(daily.cfg.ctaTarget).toBe(ROUTES.SendToRobotScreen);
  });

  it('routes course, review, mission and progress CTAs away from the demo lesson-ready screen', () => {
    const cases = [
      {
        cta: 'Start Lesson',
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <LessonDetailScreen navigation={navigation as never} route={routeFor('LessonDetailScreen')} />
        ),
      },
      {
        cta: 'Start Review',
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <ReviewEntryScreen navigation={navigation as never} route={routeFor('ReviewEntryScreen')} />
        ),
      },
      {
        cta: 'Continue Mission',
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <DailyMissionScreen navigation={navigation as never} route={routeFor('DailyMissionScreen')} />
        ),
      },
      {
        cta: 'Keep going',
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <LessonSummaryScreen navigation={navigation as never} route={routeFor('LessonSummaryScreen')} />
        ),
      },
      {
        cta: 'Practice together',
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <ReviewNeededScreen navigation={navigation as never} route={routeFor('ReviewNeededScreen')} />
        ),
      },
    ];

    for (const item of cases) {
      const navigation = navigationFor();
      const view = render(item.render(navigation));
      fireEvent.press(view.getByText(item.cta));
      expect(
        navigation.navigate.mock.calls.some(([route]) => route === ROUTES.SendToRobotScreen)
        || navigation.replace.mock.calls.some(([route]) => route === ROUTES.SendToRobotScreen),
      ).toBe(true);
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
      view.unmount();
    }
  });

  it('routes the first child handoff to the real robot assignment flow', () => {
    const navigation = navigationFor();
    render(
      <FirstLessonEntryScreen
        navigation={navigation as never}
        route={routeFor('FirstLessonEntryScreen')}
      />,
    );

    fireEvent.press(screen.getByText('Yes!'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
  });

  it('stores the real robot assignment entry as the post-onboarding protected route', () => {
    const completeOnboarding = jest.fn();
    mockedUseOptionalHousehold.mockReturnValue({ completeOnboarding } as never);
    const navigation = navigationFor();
    render(
      <FirstLessonEntryScreen
        navigation={navigation as never}
        route={routeFor('FirstLessonEntryScreen')}
      />,
    );

    fireEvent.press(screen.getByText('Yes!'));
    expect(completeOnboarding).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
    expect(completeOnboarding).not.toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
  });

  it('does not show fake mission or review progress while routing to the robot flow', () => {
    const cases = [
      {
        cta: 'Continue Mission',
        forbidden: [
          /Lesson 3/i,
          /How are you/i,
          /Review 4 words/i,
          /1 mini-game/i,
          /Finish all 3/i,
          /\+50 stars/i,
          /1\/3/i,
        ],
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <DailyMissionScreen navigation={navigation as never} route={routeFor('DailyMissionScreen')} />
        ),
      },
      {
        cta: 'Start Review',
        forbidden: [/4 words/i, /Hello/i, /\bHi\b/i, /Friend/i, /Happy/i, /Practice/i],
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <ReviewEntryScreen navigation={navigation as never} route={routeFor('ReviewEntryScreen')} />
        ),
      },
      {
        cta: 'Practice together',
        forbidden: [/3 words/i, /Friend/i, /Dog/i, /Morning/i, /Last seen/i, /2 days ago/i, /3 days ago/i, /5 days ago/i],
        render: (navigation: ReturnType<typeof navigationFor>) => (
          <ReviewNeededScreen navigation={navigation as never} route={routeFor('ReviewNeededScreen')} />
        ),
      },
    ];

    for (const item of cases) {
      const navigation = navigationFor();
      const view = render(item.render(navigation));

      for (const forbiddenText of item.forbidden) {
        expect(view.queryByText(forbiddenText)).toBeNull();
      }

      fireEvent.press(view.getByText(item.cta));
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
      view.unmount();
    }
  });
});

describe('lesson-session demo screens do not fake progression', () => {
  it('does not auto-enter greeting from connecting on a timer', () => {
    jest.useFakeTimers();
    try {
      const navigation = navigationFor();
      render(<ConnectingScreen navigation={navigation as never} route={routeFor('ConnectingScreen')} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.GreetingScreen);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not auto-complete thinking as success on a timer', () => {
    jest.useFakeTimers();
    try {
      const navigation = navigationFor();
      render(<ThinkingScreen navigation={navigation as never} route={routeFor('ThinkingScreen')} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.SuccessScreen);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not hardcode fake word counts when no real lesson progress was supplied', () => {
    const navigation = navigationFor();
    render(<LessonDoneScreen navigation={navigation as never} route={routeFor('LessonDoneScreen')} />);

    expect(screen.queryByText(/You learned 3 words today/)).toBeNull();
    expect(screen.getByText(/Robot saved today's progress/)).toBeTruthy();
  });
});
