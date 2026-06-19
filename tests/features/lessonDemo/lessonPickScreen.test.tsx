import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LessonPickScreen } from '../../../src/features/lessonDemo/screens/LessonPickScreen';
import { HAPPY_SAD_LESSON_ID } from '../../../src/features/lessonDemo/content/curatedLegacyLessons';
import { ROUTES } from '../../../src/navigation/routes';

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('LessonPickScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists curated lessons and opens fullscreen player on tap', () => {
    const screen = render(
      <LessonPickScreen
        navigation={navigation as never}
        route={{ key: 'pick', name: ROUTES.LessonPickScreen, params: { ageBand: '4-6' } }}
      />,
    );

    expect(screen.getByText('This Is a Barn')).toBeTruthy();
    expect(screen.getByText('Happy and Sad')).toBeTruthy();
    expect(screen.getByText('Red and Blue')).toBeTruthy();
    expect(screen.getByText('Cat and Dog')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Start Happy and Sad'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotFullscreenLessonScreen, {
      lessonId: HAPPY_SAD_LESSON_ID,
      ageBand: '4-6',
      autoStartVoice: true,
    });
  });
});