import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Home } from 'lucide-react-native';
import { colors } from '@/design-system/tokens/legacy-semantic';
import { MainTabIcon } from '@/navigation/MainTabNavigator';

describe('main tab active state', () => {
  it('renders a selected indicator and stronger icon stroke for the focused tab', () => {
    const screen = render(<MainTabIcon Icon={Home} color={colors.primary} focused />);

    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: colors.primaryLight,
        borderColor: 'rgba(255,107,111,0.18)',
      }),
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon.props.color).toBe(colors.primary);
    expect(icon.props.strokeWidth).toBe(2.8);
  });

  it('keeps inactive tab icons muted without the selected indicator', () => {
    const screen = render(<MainTabIcon Icon={Home} color={colors.textMuted} focused={false} />);

    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      }),
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon.props.color).toBe(colors.textMuted);
    expect(icon.props.strokeWidth).toBe(2.2);
  });
});
