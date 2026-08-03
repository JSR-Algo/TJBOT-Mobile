import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LessonDemoHomeScreen } from '../../../src/features/lesson-demo/screens/LessonDemoHomeScreen';
import { LessonRoadmapScreen } from '../../../src/features/lesson-demo/screens/LessonRoadmapScreen';
import { LessonSessionScreen } from '../../../src/features/lesson-demo/screens/LessonSessionScreen';
import { LessonShowcaseScreen } from '../../../src/features/lesson-demo/screens/LessonShowcaseScreen';
import { ParentLessonSummaryScreen } from '../../../src/features/lesson-demo/screens/ParentLessonSummaryScreen';
import { resetLessonDemoScreenProgress } from '../../../src/features/lesson-demo/screens/lessonDemoScreenModel';
import { ROUTES, type RootStackParamList } from '../../../src/navigation/routes';

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

type StackRouteName = Extract<keyof RootStackParamList, string>;

function navigationFor<RouteName extends StackRouteName>():
  NativeStackNavigationProp<RootStackParamList, RouteName> {
  return {
    dispatch: jest.fn(),
    navigate: navigation.navigate,
    navigateDeprecated: jest.fn(),
    preload: jest.fn(),
    reset: jest.fn(),
    goBack: navigation.goBack,
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(() => undefined),
    getParent: jest.fn(),
    getState: jest.fn(() => ({
      stale: false,
      type: 'stack',
      key: 'lesson-demo-test-stack',
      index: 0,
      routeNames: [],
      routes: [],
      preloadedRoutes: [],
    })),
    setParams: jest.fn(),
    replaceParams: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    setOptions: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    popTo: jest.fn(),
  };
}

const lessonHomeRoute = {
  key: ROUTES.LessonDemoHomeScreen,
  name: ROUTES.LessonDemoHomeScreen,
} satisfies RouteProp<RootStackParamList, 'LessonDemoHomeScreen'>;

const lessonRoadmapRoute = {
  key: ROUTES.LessonRoadmapScreen,
  name: ROUTES.LessonRoadmapScreen,
} satisfies RouteProp<RootStackParamList, 'LessonRoadmapScreen'>;

const lessonSessionRoute = {
  key: ROUTES.LessonSessionScreen,
  name: ROUTES.LessonSessionScreen,
} satisfies RouteProp<RootStackParamList, 'LessonSessionScreen'>;

const lessonShowcaseRoute = {
  key: ROUTES.LessonShowcaseScreen,
  name: ROUTES.LessonShowcaseScreen,
} satisfies RouteProp<RootStackParamList, 'LessonShowcaseScreen'>;

const parentLessonSummaryRoute = {
  key: ROUTES.ParentLessonSummaryScreen,
  name: ROUTES.ParentLessonSummaryScreen,
} satisfies RouteProp<RootStackParamList, 'ParentLessonSummaryScreen'>;

describe('LessonDemo screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLessonDemoScreenProgress();
  });

  it('renders home with today lesson, age selector, roadmap entry, and showcase entry', () => {
    const { getByText } = render(
      <LessonDemoHomeScreen
        navigation={navigationFor<'LessonDemoHomeScreen'>()}
        route={lessonHomeRoute}
      />,
    );

    expect(getByText('Today for Demo Learner')).toBeTruthy();
    expect(getByText('Age 4-6')).toBeTruthy();
    expect(getByText('Open six-month roadmap')).toBeTruthy();
    expect(getByText('Investor showcase')).toBeTruthy();
    expect(getByText('24 weeks')).toBeTruthy();
    expect(getByText('120 sessions')).toBeTruthy();
  });

  it('changes lesson adaptation when the age band changes', () => {
    const { getByText, queryByText } = render(
      <LessonDemoHomeScreen
        navigation={navigationFor<'LessonDemoHomeScreen'>()}
        route={lessonHomeRoute}
      />,
    );

    expect(getByText('Pictures, gestures, and one tiny phrase.')).toBeTruthy();
    fireEvent.press(getByText('Age 10-11'));

    expect(getByText('Short role-play with a parent grammar note.')).toBeTruthy();
    expect(queryByText('Pictures, gestures, and one tiny phrase.')).toBeNull();
  });

  it('shows a six-month roadmap with 24 weeks and 120 sessions', () => {
    const { getAllByText, getByText } = render(
      <LessonRoadmapScreen
        navigation={navigationFor<'LessonRoadmapScreen'>()}
        route={lessonRoadmapRoute}
      />,
    );

    expect(getByText('Six-month roadmap')).toBeTruthy();
    expect(getByText('120 sessions')).toBeTruthy();
    expect(getAllByText(/Week \d+/)).toHaveLength(24);
    expect(getAllByText('Month 6').length).toBeGreaterThan(0);
  });

  it('advances the child session one step at a time and hides future steps', () => {
    const { getByText, queryByText } = render(
      <LessonSessionScreen
        navigation={navigationFor<'LessonSessionScreen'>()}
        route={lessonSessionRoute}
      />,
    );

    expect(getByText('Step 1 of 7')).toBeTruthy();
    expect(getByText('Warm up')).toBeTruthy();
    expect(queryByText('Try it')).toBeNull();

    fireEvent.press(getByText('Next'));

    expect(getByText('Step 2 of 7')).toBeTruthy();
    expect(getByText('Learn')).toBeTruthy();
    expect(queryByText('Reward')).toBeNull();
  });

  it('writes local progress when the session is completed', () => {
    const { getByText } = render(
      <LessonSessionScreen
        navigation={navigationFor<'LessonSessionScreen'>()}
        route={lessonSessionRoute}
      />,
    );

    for (let index = 0; index < 6; index += 1) {
      fireEvent.press(getByText('Next'));
    }
    fireEvent.press(getByText('Finish'));

    const summary = render(
      <ParentLessonSummaryScreen
        navigation={navigationFor<'ParentLessonSummaryScreen'>()}
        route={parentLessonSummaryRoute}
      />,
    );
    expect(summary.getByText('Completed today')).toBeTruthy();
    expect(summary.getByText('1 lesson')).toBeTruthy();
  });

  it('renders parent summary with objective, L1 target, and review recommendation', () => {
    const { getByText } = render(
      <ParentLessonSummaryScreen
        navigation={navigationFor<'ParentLessonSummaryScreen'>()}
        route={parentLessonSummaryRoute}
      />,
    );

    expect(getByText('Parent summary')).toBeTruthy();
    expect(getByText(/Objective/)).toBeTruthy();
    expect(getByText(/Vietnamese support/)).toBeTruthy();
    expect(getByText('Next review')).toBeTruthy();
  });

  it('lets showcase launch selected week and day without debug labels', () => {
    const { getByText, queryByText } = render(
      <LessonShowcaseScreen
        navigation={navigationFor<'LessonShowcaseScreen'>()}
        route={lessonShowcaseRoute}
      />,
    );

    fireEvent.press(getByText('Week 13 showcase'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonSessionScreen, {
      week: 13,
      day: 5,
      ageBand: '7-9',
    });
    expect(queryByText(/lessonId/i)).toBeNull();
    expect(queryByText(/sourceCard/i)).toBeNull();
  });

  it('keeps child UI free of raw IDs, URLs, providers, models, routes, and source cards', () => {
    const unsafe = [
      'lessonId',
      'sourceCard',
      'https://',
      'provider',
      'model',
      '/v1/',
      'session-',
      'OpenAI',
      'Gemini',
    ];
    const view = render(
      <LessonSessionScreen
        navigation={navigationFor<'LessonSessionScreen'>()}
        route={lessonSessionRoute}
      />,
    );

    unsafe.forEach((word) => {
      expect(view.queryByText(new RegExp(word, 'i'))).toBeNull();
    });
  });

  it('renders a safe fallback lesson when the selected lesson is missing', () => {
    const { getByText } = render(
      <LessonSessionScreen
        navigation={navigationFor<'LessonSessionScreen'>()}
        route={{
          key: ROUTES.LessonSessionScreen,
          name: ROUTES.LessonSessionScreen,
          params: { week: 99, day: 9, ageBand: '7-9' },
        }}
      />,
    );

    expect(getByText('Hello and classroom comfort')).toBeTruthy();
    expect(getByText('Step 1 of 7')).toBeTruthy();
  });
});
