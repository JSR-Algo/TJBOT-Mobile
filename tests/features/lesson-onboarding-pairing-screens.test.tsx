import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import LessonDoneScreen from '@/features/lesson-session/screens/LessonDoneScreen';
import LessonReadyScreen from '@/features/lesson-session/screens/LessonReadyScreen';
import FirstCourseScreen from '@/features/purchase/screens/FirstCourseScreen';
import FirstLessonEntryScreen from '@/features/onboarding/screens/FirstLessonEntryScreen';
import PairFirstLessonScreen from '@/features/device/pairing/screens/PairFirstLessonScreen';

// useOptionalHousehold returns undefined when no provider is mounted. We mock it
// so we can drive BOTH onboarding-entry branches (provider present vs absent).
jest.mock('@/contexts/HouseholdContext', () => {
  const actual = jest.requireActual('@/contexts/HouseholdContext');
  return { ...actual, useOptionalHousehold: jest.fn() };
});
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

function routeFor(name: keyof typeof ROUTES) {
  return { key: `${name}-key`, name: ROUTES[name], params: undefined } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseOptionalHousehold.mockReturnValue(undefined);
});

describe('LessonDoneScreen', () => {
  it('renders celebration content and three stars', () => {
    const navigation = navigationFor();
    render(<LessonDoneScreen navigation={navigation as never} route={routeFor('LessonDoneScreen')} />);

    expect(screen.getByText('You did it!')).toBeTruthy();
    expect(screen.getByText(/Robot saved today's progress/)).toBeTruthy();
    // Three star glyphs are rendered by the [0,1,2].map.
    expect(screen.getAllByText('⭐')).toHaveLength(3);
  });

  it('primary CTA navigates to the lesson summary', () => {
    const navigation = navigationFor();
    render(<LessonDoneScreen navigation={navigation as never} route={routeFor('LessonDoneScreen')} />);

    fireEvent.press(screen.getByText('See what you did'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonSummaryScreen);
  });

  it('"Back home" navigates to the home hub', () => {
    const navigation = navigationFor();
    render(<LessonDoneScreen navigation={navigation as never} route={routeFor('LessonDoneScreen')} />);

    fireEvent.press(screen.getByText('Back home'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});

describe('LessonReadyScreen', () => {
  it('renders the real lesson title from route params and the headphones hint', () => {
    const navigation = navigationFor();
    const route = {
      key: 'LessonReadyScreen-key',
      name: ROUTES.LessonReadyScreen,
      params: { lessonTitle: 'Animal Friends' },
    } as never;
    render(<LessonReadyScreen navigation={navigation as never} route={route} />);

    expect(screen.getByText("Today's lesson")).toBeTruthy();
    expect(screen.getByText('Animal Friends')).toBeTruthy();
    expect(screen.getByText('Wear headphones if you can')).toBeTruthy();
  });

  it('falls back to a localized generic title (not a hardcoded literal) when no lessonTitle param', () => {
    const navigation = navigationFor();
    render(<LessonReadyScreen navigation={navigation as never} route={routeFor('LessonReadyScreen')} />);

    // No "Animal Friends" literal leak; label + title both show the generic.
    expect(screen.queryByText('Animal Friends')).toBeNull();
    expect(screen.getAllByText("Today's lesson").length).toBeGreaterThanOrEqual(1);
  });

  it('primary CTA navigates to the connecting screen', () => {
    const navigation = navigationFor();
    render(<LessonReadyScreen navigation={navigation as never} route={routeFor('LessonReadyScreen')} />);

    fireEvent.press(screen.getByText("I'm ready!"));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ConnectingScreen);
  });
});

describe('FirstCourseScreen', () => {
  it('renders the free starter course and its teaches tags', () => {
    const navigation = navigationFor();
    render(<FirstCourseScreen navigation={navigation as never} route={routeFor('FirstCourseScreen')} />);

    expect(screen.getByText('Add your first course')).toBeTruthy();
    expect(screen.getByText('Hello Friends')).toBeTruthy();
    // TEACHES.map renders one tag per topic.
    for (const tag of ['Greetings', 'Names', 'Family', 'Feelings']) {
      expect(screen.getByText(tag)).toBeTruthy();
    }
  });

  it('primary CTA sends the course to the robot (CourseAddedScreen)', () => {
    const navigation = navigationFor();
    render(<FirstCourseScreen navigation={navigation as never} route={routeFor('FirstCourseScreen')} />);

    fireEvent.press(screen.getByText('Send Hello Friends to Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseAddedScreen);
  });

  it('secondary CTA opens the course library', () => {
    const navigation = navigationFor();
    render(<FirstCourseScreen navigation={navigation as never} route={routeFor('FirstCourseScreen')} />);

    fireEvent.press(screen.getByText('Explore the library first'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);
  });
});

describe('FirstLessonEntryScreen', () => {
  it('renders a starter lesson preview before the child starts', () => {
    mockedUseOptionalHousehold.mockReturnValue(undefined);
    const navigation = navigationFor();
    render(
      <FirstLessonEntryScreen navigation={navigation as never} route={routeFor('FirstLessonEntryScreen')} />,
    );

    expect(screen.getByText('Starter lesson')).toBeTruthy();
    expect(screen.getByText('Hello Friends')).toBeTruthy();
    expect(screen.getByText('Say hello to Panda')).toBeTruthy();
    expect(screen.getByLabelText('Starter lesson preview with Robot and hello word cards')).toBeTruthy();
  });

  it('without a household provider, falls back to legacyNavigate → SendToRobotScreen', () => {
    mockedUseOptionalHousehold.mockReturnValue(undefined);
    const navigation = navigationFor();
    render(
      <FirstLessonEntryScreen navigation={navigation as never} route={routeFor('FirstLessonEntryScreen')} />,
    );

    expect(screen.getByText('Hand the phone to your child')).toBeTruthy();
    fireEvent.press(screen.getByText('Yes!'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
  });

  it('with a household provider, calls completeOnboarding(SendToRobotScreen) and does NOT legacy-navigate', () => {
    const completeOnboarding = jest.fn();
    mockedUseOptionalHousehold.mockReturnValue({ completeOnboarding } as never);
    const navigation = navigationFor();
    render(
      <FirstLessonEntryScreen navigation={navigation as never} route={routeFor('FirstLessonEntryScreen')} />,
    );

    fireEvent.press(screen.getByText('Yes!'));
    expect(completeOnboarding).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('PairFirstLessonScreen', () => {
  it('renders all three "what happens next" steps', () => {
    const navigation = navigationFor();
    render(
      <PairFirstLessonScreen navigation={navigation as never} route={routeFor('PairFirstLessonScreen')} />,
    );

    expect(screen.getByText('Robot is waiting!')).toBeTruthy();
    expect(screen.getByText('Robot greets your child by Buddy')).toBeTruthy();
    expect(screen.getByText('A 4-minute starter lesson plays')).toBeTruthy();
    expect(screen.getByText("You'll see today's summary here")).toBeTruthy();
    // The numbered badges 1..3 from NEXT_STEPS.map.
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('primary CTA resets the stack to the device home screen', () => {
    const navigation = navigationFor();
    render(
      <PairFirstLessonScreen navigation={navigation as never} route={routeFor('PairFirstLessonScreen')} />,
    );

    fireEvent.press(screen.getByText('Hand it to your child'));
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: ROUTES.DeviceHomeScreen }],
    });
  });
});
