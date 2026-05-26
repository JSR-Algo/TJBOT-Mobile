import React from 'react';
import { Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';
import DeviceRow from '@/components/DeviceRow';

describe('DeviceRow', () => {
  it('renders string icons inside a Text host for React Native', () => {
    const { UNSAFE_getAllByType } = render(
      <DeviceRow icon="📚" title="Browse Course Library" body="Add or remove courses" />,
    );

    const textHosts = UNSAFE_getAllByType(RNText);

    expect(textHosts.some(host => host.props.children === '📚')).toBe(true);
  });
});
