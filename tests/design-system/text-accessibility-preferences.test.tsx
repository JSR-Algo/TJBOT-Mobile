import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from '@/design-system/primitives/Text';
import { setAccessibilityPreferences } from '@/services/accessibility/preferences';

describe('Text accessibility preferences', () => {
  beforeEach(async () => {
    await setAccessibilityPreferences({ largeText: false, reduceMotion: false });
  });

  it('increases explicit font size and line height when larger text is enabled', async () => {
    await setAccessibilityPreferences({ largeText: true });
    const screen = render(<Text style={{ fontSize: 20, lineHeight: 24 }}>Readable copy</Text>);

    await waitFor(() => {
      const style = StyleSheet.flatten(screen.getByText('Readable copy').props.style);
      expect(style.fontSize).toBe(23);
      expect(style.lineHeight).toBe(28);
    });
  });

  it('reacts to a preference change without remounting the app', async () => {
    const screen = render(<Text style={{ fontSize: 20 }}>Live copy</Text>);
    expect(StyleSheet.flatten(screen.getByText('Live copy').props.style).fontSize).toBe(20);

    await act(async () => {
      await setAccessibilityPreferences({ largeText: true });
    });

    await waitFor(() => {
      expect(StyleSheet.flatten(screen.getByText('Live copy').props.style).fontSize).toBe(23);
    });
  });
});
