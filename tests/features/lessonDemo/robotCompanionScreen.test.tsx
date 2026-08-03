import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { RobotCompanionScreen } from '../../../src/features/lesson-demo/screens/RobotCompanionScreen';
import { BARN_SAY_IT_LESSON_ID } from '../../../src/features/lesson-demo/content/curatedLegacyLessons';
import { ROUTES } from '../../../src/navigation/routes';

jest.mock('../../../src/hooks/useGeminiConversation', () => ({
  useGeminiConversation: () => ({
    startConversation: jest.fn(),
    stopConversation: jest.fn(),
    interruptPlayback: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('RobotCompanionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows companion UI and transitions into the fullscreen lesson', () => {
    const screen = render(
      <RobotCompanionScreen
        navigation={navigation as never}
        route={{
          key: 'companion',
          name: ROUTES.RobotCompanionScreen,
          params: { lessonId: BARN_SAY_IT_LESSON_ID, ageBand: '4-6', autoStartVoice: true },
        }}
      />,
    );

    expect(screen.getByTestId('robot-companion-screen')).toBeTruthy();
    expect(screen.getByText('Just chatting')).toBeTruthy();
    expect(screen.getByText('Up next: This Is a Barn')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    fireEvent.press(screen.getByLabelText('Start lesson This Is a Barn'));

    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.RobotFullscreenLessonScreen, {
      lessonId: BARN_SAY_IT_LESSON_ID,
      ageBand: '4-6',
      autoStartVoice: true,
    });
  });
});