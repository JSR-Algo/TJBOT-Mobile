import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from '@/design-system/primitives/Text';
import { useReduceMotion } from '@/design-system/animations/useReduceMotion';
import { setAccessibilityPreferences } from '@/services/accessibility/preferences';

function ReduceMotionProbe() {
  const reduced = useReduceMotion();
  return <Text testID="reduceMotionValue">{String(reduced)}</Text>;
}

describe('useReduceMotion accessibility preference', () => {
  beforeEach(async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    await setAccessibilityPreferences({ largeText: false, reduceMotion: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('combines the saved app preference with the system preference', async () => {
    const screen = render(<ReduceMotionProbe />);
    await waitFor(() => expect(screen.getByTestId('reduceMotionValue').props.children).toBe('false'));

    await act(async () => {
      await setAccessibilityPreferences({ reduceMotion: true });
    });

    await waitFor(() => expect(screen.getByTestId('reduceMotionValue').props.children).toBe('true'));
  });
});
