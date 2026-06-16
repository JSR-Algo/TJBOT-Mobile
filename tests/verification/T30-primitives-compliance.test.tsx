import React from 'react';
import { View, Vibration, Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

import { Pressable } from '@/design-system/primitives/Pressable';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

const mockUseReduceMotion = jest.fn().mockReturnValue(false);

jest.mock('@/design-system/animations/useReduceMotion', () => ({
  __esModule: true,
  useReduceMotion: (...args: unknown[]) => mockUseReduceMotion(...args),
}));

jest.mock('@/design-system/tokens', () => {
  const actual = jest.requireActual('@/design-system/tokens');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    tokens: {
      ...actual.tokens,
      typography: {
        ...actual.tokens.typography,
        fonts: {
          ...actual.tokens.typography.fonts,
          kid: 'MockKidFont',
        },
      },
    },
  };
});

describe('T30: Haptics, Box typing, and Text primitive compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReduceMotion.mockReturnValue(false);
  });

  describe('Pressable', () => {
    it('uses expo-haptics light impact on press and does not vibrate', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Pressable onPress={onPress} testID="pressable">
          <View />
        </Pressable>,
      );

      fireEvent.press(getByTestId('pressable'));

      expect(impactAsync).toHaveBeenCalledTimes(1);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(onPress).toHaveBeenCalled();
    });

    it('skips haptics when reduced motion is enabled', () => {
      mockUseReduceMotion.mockReturnValue(true);

      const { getByTestId } = render(
        <Pressable onPress={() => undefined} testID="pressable">
          <View />
        </Pressable>,
      );

      fireEvent.press(getByTestId('pressable'));

      expect(impactAsync).not.toHaveBeenCalled();
      expect(Vibration.vibrate).not.toHaveBeenCalled();
    });

    it('skips haptics on web', () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        configurable: true,
        writable: true,
      });

      const { getByTestId } = render(
        <Pressable onPress={() => undefined} testID="pressable">
          <View />
        </Pressable>,
      );

      fireEvent.press(getByTestId('pressable'));

      expect(impactAsync).not.toHaveBeenCalled();
      expect(Vibration.vibrate).not.toHaveBeenCalled();

      Object.defineProperty(Platform, 'OS', {
        value: originalOS,
        configurable: true,
        writable: true,
      });
    });

    it('allows callers to opt out of haptics with haptic={false}', () => {
      const { getByTestId } = render(
        <Pressable onPress={() => undefined} testID="pressable" haptic={false}>
          <View />
        </Pressable>,
      );

      fireEvent.press(getByTestId('pressable'));

      expect(impactAsync).not.toHaveBeenCalled();
      expect(Vibration.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('Box', () => {
    it('resolves borderColor from a design token', () => {
      const { getByTestId } = render(
        <Box testID="box" borderColor="coral" />,
      );

      const box = getByTestId('box');
      expect(box.props.style).toEqual(
        expect.arrayContaining([{ borderColor: '#FF6F61' }]),
      );
    });

    it('passes raw borderColor strings through unchanged', () => {
      const { getByTestId } = render(
        <Box testID="box" borderColor="#123456" />,
      );

      const box = getByTestId('box');
      expect(box.props.style).toEqual(
        expect.arrayContaining([{ borderColor: '#123456' }]),
      );
    });

    it('forwards percentage width and height strings', () => {
      const { getByTestId } = render(
        <Box testID="box" width="50%" height="100%" />,
      );

      const box = getByTestId('box');
      expect(box.props.style).toEqual(
        expect.arrayContaining([{ width: '50%' }]),
      );
      expect(box.props.style).toEqual(
        expect.arrayContaining([{ height: '100%' }]),
      );
    });
  });

  describe('Text', () => {
    it('derives fontFamily from tokens.typography.fonts', () => {
      const { getByTestId } = render(
        <Text testID="text">Hello</Text>,
      );

      const text = getByTestId('text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([{ fontFamily: 'MockKidFont' }]),
      );
    });

    it('supports lineHeight and letterSpacing props', () => {
      // Use React.createElement with `as any` to avoid a TypeScript error
      // while the props are still missing from the current interface.
      const { getByTestId } = render(
        React.createElement(
          Text as any,
          { testID: 'text', lineHeight: 28, letterSpacing: 0.5 },
          'Hello',
        ),
      );

      const text = getByTestId('text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([{ lineHeight: 28 }]),
      );
      expect(text.props.style).toEqual(
        expect.arrayContaining([{ letterSpacing: 0.5 }]),
      );
    });
  });
});
