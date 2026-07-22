import React from 'react';
import { Alert } from 'react-native';
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

  it('unavailable: no fake live streak/level and no barn companion launch', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
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

    expect(screen.getByTestId('homeHonestyBadge')).toBeTruthy();
    expect(screen.getByText('No updates yet')).toBeTruthy();
    expect(screen.getByText('No lesson plan yet')).toBeTruthy();
    expect(
      screen.getByText("We'll show today's plan here when it's ready"),
    ).toBeTruthy();
    expect(screen.queryByText(/Home contract/i)).toBeNull();
    expect(screen.queryByText(/ESP bridge/i)).toBeNull();
    expect(screen.queryByText('Home status not live yet')).toBeNull();
    expect(screen.queryByText('Live home feed not connected yet')).toBeNull();
    expect(screen.getByText('Streak not available yet')).toBeTruthy();
    expect(screen.getByText('Level not available yet')).toBeTruthy();
    expect(screen.queryByText('1-day streak')).toBeNull();
    expect(screen.queryByText('Level 1')).toBeNull();
    expect(screen.queryByText('Barn & Farm words')).toBeNull();
    expect(screen.getByTestId('homePrimaryCta')).toHaveTextContent('Browse lessons');

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      ROUTES.RobotCompanionScreen,
      expect.anything(),
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Robot pairing later',
      expect.not.stringMatching(/ESP/i),
      expect.any(Array),
    );
    alertSpy.mockRestore();
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
    expect(screen.getByText('Something went sideways')).toBeTruthy();
    expect(screen.queryByText('1-day streak')).toBeNull();
    expect(screen.queryByText('Barn & Farm words')).toBeNull();
    expect(screen.getByTestId('homePrimaryCta')).toHaveTextContent('Retry Home');

    fireEvent.press(screen.getByTestId('homePrimaryCta'));
    expect(refetch).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.LessonReadyScreen);

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      ROUTES.RobotCompanionScreen,
      expect.anything(),
    );
  });

  it('live success: uses hub streakDays and nextLessonId instead of hardcoded barn metrics', () => {
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
      },
      refetch: jest.fn(),
      cfg: {
        ...baseCfg,
        chip: { text: "Today's lesson is ready!", color: '#FF6F61' },
      },
    });

    const { screen, navigation } = renderHome();

    expect(screen.getByText('4-day streak')).toBeTruthy();
    expect(screen.queryByText('1-day streak')).toBeNull();
    expect(screen.queryByText('Level 1')).toBeNull();
    expect(screen.getByText('Hello Friends')).toBeTruthy();
    expect(screen.queryByText('Barn & Farm words')).toBeNull();

    fireEvent.press(screen.getByTestId('homeHeroRobot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotCompanionScreen, {
      lessonId: 'w02-d03-hello-friends',
      ageBand: '4-6',
      autoStartVoice: true,
    });
  });
});
