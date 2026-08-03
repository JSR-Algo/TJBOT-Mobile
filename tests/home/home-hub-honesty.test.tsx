import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeHubScreen from '@/features/home/screens/HomeHubScreen';
import { ROUTES } from '@/navigation/routes';

const mockUseHomeState = jest.fn();

jest.mock('@/features/home/hooks/useHomeState', () => ({
  useHomeState: () => mockUseHomeState(),
}));

function renderHome() {
  const navigation = { navigate: jest.fn() };
  const screen = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 59, left: 0, right: 0, bottom: 34 },
      }}
    >
      <HomeHubScreen
        navigation={navigation as never}
        route={{ key: 'home', name: ROUTES.HomeHubScreen } as never}
      />
    </SafeAreaProvider>,
  );
  return { screen, navigation };
}

const baseCfg = {
  emotion: 'happy' as const,
  accent: '#FFC857',
  chip: null,
  ctaLabel: "Start Today's Lesson",
  ctaIcon: '▶',
  ctaColor: '#FF6F61',
  ctaTarget: ROUTES.LessonReadyScreen,
  ctaEnabled: true,
  reviewBadge: null,
  courseBadge: null,
  dimSecondary: false,
  forceGreet: false,
  quickActions: [],
};

describe('HomeHubScreen honesty paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loading: mirrors the blueprint skeleton instead of showing a blank robot-only screen', () => {
    mockUseHomeState.mockReturnValue({
      variant: 'idle',
      isLoading: true,
      isError: false,
      homeContractAvailable: true,
      contentMode: 'live',
      demoBadge: { simulated: false, label: null },
      data: undefined,
      refetch: jest.fn(),
      cfg: baseCfg,
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByTestId('homeLoadingSkeleton')).toBeTruthy();
    expect(screen.getByTestId('homeLoadingHeader')).toBeTruthy();
    expect(screen.getByTestId('homeLoadingRobot')).toBeTruthy();
    expect(screen.getByTestId('homeLoadingLesson')).toBeTruthy();
    expect(screen.getByTestId('homeLoadingMetrics')).toBeTruthy();
    expect(screen.getByTestId('homeLoadingAction')).toBeTruthy();
    expect(screen.queryByTestId('homePrimaryCta')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('zero child: keeps the canonical animated Home design and routes setup into child profile creation', () => {
    mockUseHomeState.mockReturnValue({
      variant: 'zero_child',
      isLoading: false,
      isError: false,
      homeContractAvailable: true,
      contentMode: 'live',
      demoBadge: { simulated: false, label: null },
      data: {
        variant: 'zero_child',
        childName: null,
        streakDays: 0,
        todayMinutes: 0,
        lessonsCompletedToday: 0,
        wordsLearnedThisWeek: 0,
        nextLessonId: null,
        nextLesson: null,
        children: [],
        selectedChildId: null,
      },
      refetch: jest.fn(),
      cfg: {
        ...baseCfg,
        ctaLabel: 'Start today’s lesson',
        ctaTarget: ROUTES.ChildProfileScreen,
      },
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByTestId('overviewPage')).toBeTruthy();
    expect(screen.getByTestId('homeHeroAnimatedRobot')).toBeTruthy();
    expect(screen.getByTestId('homeHeroRobotAnimation')).toBeTruthy();
    expect(screen.getAllByText('Name your child').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('homeEmptyCard')).toBeNull();
    fireEvent.press(screen.getByTestId('homePrimaryCta'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeChildProfileScreen);
  });

  it('multiple children: selects a child before continuing and keeps Add child direct', () => {
    const selectChild = jest.fn();
    mockUseHomeState.mockReturnValue({
      variant: 'multiple_children',
      isLoading: false,
      isError: false,
      homeContractAvailable: true,
      contentMode: 'live',
      demoBadge: { simulated: false, label: null },
      data: {
        variant: 'multiple_children',
        childName: null,
        streakDays: 0,
        todayMinutes: 0,
        lessonsCompletedToday: 0,
        wordsLearnedThisWeek: 0,
        nextLessonId: null,
        nextLesson: null,
        children: [
          { id: 'child-1', name: 'Mina', streakDays: 7, lastSessionDate: null },
          { id: 'child-2', name: 'Bao', streakDays: 3, lastSessionDate: null },
        ],
        selectedChildId: null,
      },
      refetch: jest.fn(),
      selectChild,
      cfg: baseCfg,
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByText('Pick a child')).toBeTruthy();
    fireEvent.press(screen.getByTestId('homeChildOption-child-2'));
    expect(selectChild).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('homeContinueChild'));
    expect(selectChild).toHaveBeenCalledWith('child-2');

    fireEvent.press(screen.getByTestId('homeAddChild'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeChildProfileScreen);
  });

  it('streak lost: shows only backend lesson and progress data, then opens that lesson', () => {
    mockUseHomeState.mockReturnValue({
      variant: 'streak_lost',
      isLoading: false,
      isError: false,
      homeContractAvailable: true,
      contentMode: 'live',
      demoBadge: { simulated: false, label: null },
      data: {
        variant: 'streak_lost',
        childName: 'Mina',
        streakDays: 0,
        todayMinutes: 0,
        lessonsCompletedToday: 0,
        wordsLearnedThisWeek: 12,
        nextLessonId: 'lesson-1',
        nextLesson: {
          id: 'lesson-1',
          title: 'Hello Farm',
          durationMinutes: 5,
          focusItems: ['barn', 'cow', 'horse', 'pig'],
          totalSteps: 4,
          state: 'READY',
        },
        children: [{ id: 'child-1', name: 'Mina', streakDays: 0, lastSessionDate: '2026-07-20' }],
        selectedChildId: 'child-1',
      },
      refetch: jest.fn(),
      selectChild: jest.fn(),
      cfg: {
        ...baseCfg,
        chip: { text: "Let's start a fresh streak today", color: '#FFC857' },
        ctaTarget: ROUTES.LessonReadyScreen,
      },
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByTestId('homeStreakLostCard')).toBeTruthy();
    expect(screen.getByText('Hello Farm')).toBeTruthy();
    expect(screen.getByText('12 words')).toBeTruthy();
    expect(screen.queryByText('1/4')).toBeNull();
    fireEvent.press(screen.getByTestId('homeStreakLessonCta'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
  });

  it('unavailable: no fake live streak/level and no barn companion launch', () => {
    mockUseHomeState.mockReturnValue({
      variant: 'idle',
      isLoading: false,
      isError: false,
      homeContractAvailable: false,
      contentMode: 'unavailable',
      demoBadge: { simulated: false, label: null },
      data: undefined,
      refetch: jest.fn(),
      cfg: baseCfg,
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByText('Home unavailable')).toBeTruthy();
    expect(screen.getByText('No lesson plan yet')).toBeTruthy();
    expect(screen.getByText('TeeBot needs attention')).toBeTruthy();
    expect(screen.queryByText(/Home contract/i)).toBeNull();
    expect(screen.queryByText(/ESP bridge/i)).toBeNull();
    expect(screen.queryByText('Home status not live yet')).toBeNull();
    expect(screen.queryByText('Live home feed not connected yet')).toBeNull();
    expect(screen.queryByText('Streak not available yet')).toBeNull();
    expect(screen.queryByText('Level not available yet')).toBeNull();
    expect(screen.queryByText('1-day streak')).toBeNull();
    expect(screen.queryByText('Level 1')).toBeNull();
    expect(screen.queryByText('Barn & Farm Words')).toBeNull();
    expect(screen.getByTestId('homePrimaryCta')).toHaveTextContent('Browse');

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('homePrimaryCta'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);
  });

  it('live error: shows retry and never fabricates ready lesson metrics', () => {
    const refetch = jest.fn();
    mockUseHomeState.mockReturnValue({
      variant: 'error',
      isLoading: false,
      isError: true,
      homeContractAvailable: true,
      contentMode: 'error',
      demoBadge: { simulated: false, label: null },
      data: undefined,
      refetch,
      cfg: {
        ...baseCfg,
        chip: { text: 'Something went sideways', color: '#FF6F61' },
        ctaLabel: 'Retry Home',
        ctaTarget: ROUTES.HomeHubScreen,
      },
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByText('Could not load Home')).toBeTruthy();
    expect(screen.getByText('Home unavailable')).toBeTruthy();
    expect(screen.getByText('TeeBot needs attention')).toBeTruthy();
    expect(screen.queryByText('1-day streak')).toBeNull();
    expect(screen.queryByText('Barn & Farm Words')).toBeNull();
    expect(screen.getByTestId('homePrimaryCta')).toHaveTextContent('Retry');

    fireEvent.press(screen.getByTestId('homePrimaryCta'));
    expect(refetch).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.LessonReadyScreen);

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      ROUTES.RobotCompanionScreen,
      expect.anything(),
    );
  });

  it('live success: mirrors the three-action Home Hub blueprint and keeps lesson launch on its CTA', () => {
    mockUseHomeState.mockReturnValue({
      variant: 'daily_available',
      isLoading: false,
      isError: false,
      homeContractAvailable: true,
      contentMode: 'live',
      demoBadge: { simulated: false, label: null },
      data: {
        childName: 'Mina',
        streakDays: 4,
        todayMinutes: 6,
        nextLessonId: 'w02-d03-hello-friends',
        nextLesson: {
          id: 'w02-d03-hello-friends',
          title: 'Hello Friends',
          durationMinutes: 5,
          focusItems: ['hello'],
          totalSteps: 3,
          state: 'READY',
        },
      },
      refetch: jest.fn(),
      cfg: {
        ...baseCfg,
        chip: { text: "Today's lesson is ready!", color: '#FF6F61' },
      },
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByText('Ready when Mina is')).toBeTruthy();
    expect(screen.queryByText('4-day streak')).toBeNull();
    expect(screen.getByText('Hello Friends')).toBeTruthy();
    expect(screen.queryAllByTestId(/^homeQuickAction-/)).toHaveLength(0);

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, {
      lessonTitle: 'Hello Friends',
    });

    fireEvent.press(screen.getByTestId('homePrimaryCta'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
  });
});
