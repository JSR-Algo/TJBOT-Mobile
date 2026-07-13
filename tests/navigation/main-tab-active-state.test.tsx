import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Home } from 'lucide-react-native';
import { MainTabIcon } from '@/navigation/MainTabNavigator';

describe('main tab active state', () => {
  it('renders a selected indicator and stronger icon stroke for the focused tab', () => {
    const screen = render(<MainTabIcon Icon={Home} color="#FF6B6B" focused />);

    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255,107,107,0.1)',
      }),
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon.props.color).toBe('#FF6B6B');
    expect(icon.props.strokeWidth).toBe(2.8);
  });

  it('keeps inactive tab icons muted without the selected indicator', () => {
    const screen = render(<MainTabIcon Icon={Home} color="#636E72" focused={false} />);

    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: 'transparent',
      }),
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon.props.color).toBe('#636E72');
    expect(icon.props.strokeWidth).toBe(2.2);
  });
});
