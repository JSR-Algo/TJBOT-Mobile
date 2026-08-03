import React from 'react';
import { render } from '@testing-library/react-native';
import DeviceRow from '@/components/DeviceRow';

describe('DeviceRow', () => {
  it('renders string icon names through the shared semantic icon component', () => {
    const screen = render(
      <DeviceRow icon="BookOpen" title="Browse Course Library" body="Add or remove courses" />,
    );

    expect(screen.getByTestId('device-row-semantic-icon')).toBeTruthy();
  });
});
