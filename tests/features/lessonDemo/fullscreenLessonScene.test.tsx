import React from 'react';
import { render } from '@testing-library/react-native';
import { FullscreenLessonScene } from '../../../src/features/lesson-demo/scene/FullscreenLessonScene';
import { getBarnSayItLesson } from '../../../src/features/lesson-demo/content/barnSayItLesson';

describe('FullscreenLessonScene', () => {
  it('renders fullscreen video background and robot overlay for barn lesson', () => {
    const lesson = getBarnSayItLesson('4-6');
    const step = lesson.steps[0]!;

    const screen = render(
      <FullscreenLessonScene
        lesson={lesson}
        step={step}
        stepIndex={0}
        totalSteps={lesson.steps.length}
        voiceActive
        isSpeaking
      />,
    );

    expect(screen.getByTestId('fullscreen-lesson-scene')).toBeTruthy();
    expect(screen.getByTestId('mock-video-view')).toBeTruthy();
    expect(screen.getByTestId('fullscreen-clay-robot')).toBeTruthy();
    expect(screen.getByText(step.prompt)).toBeTruthy();
  });
});