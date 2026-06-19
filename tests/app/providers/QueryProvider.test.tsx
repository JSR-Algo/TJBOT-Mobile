import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { QueryProvider } from '@/app/providers/QueryProvider';

describe('QueryProvider', () => {
  it('renders children inside the React Query provider', () => {
    const { getByTestId } = render(
      <QueryProvider>
        <View testID="child" />
      </QueryProvider>,
    );
    expect(getByTestId('child')).toBeTruthy();
  });
});
