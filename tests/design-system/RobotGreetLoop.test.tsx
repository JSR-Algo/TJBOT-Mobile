import React from 'react';
import { Image } from 'react-native';
import { act, render } from '@testing-library/react-native';
import RobotGreetLoop from '../../src/design-system/components/RobotGreetLoop';

describe('RobotGreetLoop', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('advances to a different greeting frame', () => {
    jest.useFakeTimers();
    const screen = render(<RobotGreetLoop />);
    const firstSource = screen.UNSAFE_getByType(Image).props.source;

    act(() => {
      jest.advanceTimersByTime(125);
    });

    expect(screen.UNSAFE_getByType(Image).props.source).not.toBe(firstSource);
  });

  it('holds the fallback pose when motion is reduced', () => {
    jest.useFakeTimers();
    const screen = render(<RobotGreetLoop reduceMotion />);
    const firstSource = screen.UNSAFE_getByType(Image).props.source;

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(screen.UNSAFE_getByType(Image).props.source).toBe(firstSource);
  });
});
