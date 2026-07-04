import React from 'react';
import { render } from '@testing-library/react-native';
import ClayRobotScreen from '../../src/components/ClayRobotScreen';

describe('ClayRobotScreen', () => {
  it('renders clay head LCD with mood-specific test id', () => {
    const screen = render(<ClayRobotScreen mood="celebrate" size={120} testID="clay-test" />);
    expect(screen.getByTestId('clay-test')).toBeTruthy();
    expect(screen.getByTestId('clay-test-lcd')).toBeTruthy();
    expect(screen.getByTestId('clay-test-chest-glow')).toBeTruthy();
  });
});