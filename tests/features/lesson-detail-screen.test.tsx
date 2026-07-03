/**
 * Round-1 coverage closeout for LessonDetailScreen (course/screens).
 *
 * It is a static presentational screen: it renders a hardcoded ACTIVITIES
 * list and wires two navigation callbacks (back → UnitScreen, CTA →
 * SendToRobotScreen). This test renders it and exercises both callbacks,
 * covering the component body + the two arrow functions (lines 23-58).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LessonDetailScreen from '@/features/course/screens/LessonDetailScreen';
import { ROUTES } from '@/navigation/routes';

function navigationFor() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

describe('LessonDetailScreen', () => {
  function renderScreen() {
    const navigation = navigationFor();
    render(
      <LessonDetailScreen
        navigation={navigation as never}
        route={{ key: 'r', name: ROUTES.LessonDetailScreen, params: {} } as never}
      />,
    );
    return navigation;
  }

  it('renders the header, robot intro and the hardcoded ACTIVITIES list', () => {
    renderScreen();
    expect(screen.getByText('How are you?')).toBeTruthy();
    expect(screen.getByText('Lesson 3')).toBeTruthy();
    // All three ACTIVITIES rows render (the .map body, lines 39-47).
    expect(screen.getByText('Listen to Robot')).toBeTruthy();
    expect(screen.getByText('Say it back')).toBeTruthy();
    expect(screen.getByText('Play a word game')).toBeTruthy();
    expect(screen.getByText('Start Lesson')).toBeTruthy();
  });

  it('CTA press navigates to SendToRobotScreen (line 58 callback)', () => {
    const navigation = renderScreen();
    fireEvent.press(screen.getByText('Start Lesson'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
  });

  it('back press navigates to UnitScreen (line 26 callback)', () => {
    const navigation = renderScreen();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnitScreen);
  });
});
