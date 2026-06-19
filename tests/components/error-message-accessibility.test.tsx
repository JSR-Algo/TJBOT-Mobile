import React from 'react';
import { render } from '@testing-library/react-native';
import { ErrorMessage } from '@/components/ErrorMessage';

describe('ErrorMessage accessibility', () => {
  it('does not render empty error containers', () => {
    const screen = render(<ErrorMessage message="" />);

    expect(screen.toJSON()).toBeNull();
  });

  it('announces visible errors as alerts', () => {
    const screen = render(<ErrorMessage message="Network request failed" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(screen.getByLabelText('Warning')).toBeTruthy();
    expect(screen.getByText('Network request failed')).toBeTruthy();
  });
});
