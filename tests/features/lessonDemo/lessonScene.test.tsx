import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LessonSessionScreen } from '../../../src/features/lessonDemo/screens/LessonSessionScreen';
import { staticLessonContentProvider } from '../../../src/features/lessonDemo';
import { resolveLessonSceneScript } from '../../../src/features/lessonDemo/scene';
import { ROUTES, type RootStackParamList } from '../../../src/navigation/routes';
import type { LessonSession, LessonStep } from '../../../src/features/lessonDemo';

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

const lessonSessionRoute = {
  key: ROUTES.LessonSessionScreen,
  name: ROUTES.LessonSessionScreen,
} satisfies RouteProp<RootStackParamList, 'LessonSessionScreen'>;

describe('lesson scene engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the leaf pet hidden until the final lesson beat and emits PET_POP only then', () => {
    const lesson = staticLessonContentProvider.getTodaySession('7-9');
    const firstStep = lesson.steps[0];
    const finalStep = lesson.steps[lesson.steps.length - 1];

    const openingScript = resolveLessonSceneScript({
      lesson,
      step: firstStep,
      stepIndex: 0,
      totalSteps: lesson.steps.length,
    });
    const finalScript = resolveLessonSceneScript({
      lesson,
      step: finalStep,
      stepIndex: lesson.steps.length - 1,
      totalSteps: lesson.steps.length,
    });

    expect(openingScript.petPose).toBe('hidden');
    expect(openingScript.hardwareEvents).not.toContain('PET_POP');
    expect(finalScript.petPose).toBe('pop-out');
    expect(finalScript.hardwareEvents).toEqual(
      expect.arrayContaining(['PET_POP', 'TEEBOT_CELEBRATE', 'WORD_CARD_SHOW']),
    );
  });

  it('keeps the word visible while disabling camera motion in reduced-motion mode', () => {
    const lesson = staticLessonContentProvider.getTodaySession('7-9');
    const step = lesson.steps[1];

    const script = resolveLessonSceneScript({
      lesson,
      step,
      stepIndex: 1,
      totalSteps: lesson.steps.length,
      reducedMotion: true,
    });

    expect(script.wordCardVisible).toBe(true);
    expect(script.targetWord).toBe(lesson.focusItems[0]);
    expect(script.cameraPush).toBe(false);
    expect(script.robotMotion).toBe('LOOK_FORWARD');
  });

  it('does not reveal the pet for a non-final reward checkpoint', () => {
    const lesson = staticLessonContentProvider.getTodaySession('7-9');
    const checkpointStep: LessonStep = {
      ...lesson.steps[0],
      id: 'checkpoint-reward-step',
      type: 'reward',
      robotState: 'celebrating',
    };
    const lessonWithCheckpoint: LessonSession = {
      ...lesson,
      steps: [lesson.steps[0], checkpointStep, ...lesson.steps.slice(1)],
    };

    const script = resolveLessonSceneScript({
      lesson: lessonWithCheckpoint,
      step: checkpointStep,
      stepIndex: 1,
      totalSteps: lessonWithCheckpoint.steps.length,
    });

    expect(script.petPose).toBe('hidden');
    expect(script.hardwareEvents).not.toContain('PET_POP');
    expect(script.hardwareEvents).toContain('PET_HIDE');
  });

  it('maps robot states to canonical hardware events', () => {
    const lesson = staticLessonContentProvider.getTodaySession('7-9');
    const stateToEvent = {
      idle: 'TEEBOT_IDLE',
      listening: 'TEEBOT_LISTEN',
      modeling: 'TEEBOT_POINT',
      thinking: 'TEEBOT_THINK',
      celebrating: 'TEEBOT_CELEBRATE',
    } as const;

    Object.entries(stateToEvent).forEach(([robotState, eventName]) => {
      const step: LessonStep = {
        ...lesson.steps[0],
        id: `state-${robotState}`,
        robotState: robotState as LessonStep['robotState'],
      };

      const script = resolveLessonSceneScript({
        lesson,
        step,
        stepIndex: 1,
        totalSteps: lesson.steps.length,
      });

      expect(script.hardwareEvents).toContain(eventName);
    });

    const openingScript = resolveLessonSceneScript({
      lesson,
      step: lesson.steps[0],
      stepIndex: 0,
      totalSteps: lesson.steps.length,
    });
    expect(openingScript.hardwareEvents).toContain('TEEBOT_WAVE');
  });

  it('renders the scene in the lesson screen and reveals the pet only on the final reward step', () => {
    const view = render(
      <LessonSessionScreen
        navigation={navigationFor<'LessonSessionScreen'>()}
        route={lessonSessionRoute}
        __disableSceneAnimations
      />,
    );

    expect(view.getByTestId('lesson-scene')).toBeTruthy();
    expect(view.getByTestId('lesson-scene-pet-hidden')).toBeTruthy();
    expect(view.queryByTestId('lesson-scene-pet-pop-out')).toBeNull();

    for (let index = 0; index < 6; index += 1) {
      fireEvent.press(view.getByText('Next'));
    }

    expect(view.getByTestId('lesson-scene-pet-pop-out')).toBeTruthy();
  });
});
