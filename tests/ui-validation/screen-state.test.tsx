import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScreenState } from '../../src/components/ScreenState';

describe('ScreenState', () => {
  it('renders a loading state with its message', () => {
    const { getByTestId, getByText } = render(
      <ScreenState variant="loading" message="Loading today's progress" />,
    );
    expect(getByTestId('screen-state-loading')).toBeTruthy();
    expect(getByText("Loading today's progress")).toBeTruthy();
  });

  it('renders an empty state with a default title', () => {
    const { getByText } = render(<ScreenState variant="empty" />);
    expect(getByText('Nothing here yet')).toBeTruthy();
  });

  it('renders an error with a retry button that fires onRetry', () => {
    const onRetry = jest.fn();
    const { getByText, getByLabelText } = render(
      <ScreenState variant="error" message="Couldn't load history." onRetry={onRetry} />,
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    fireEvent.press(getByLabelText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when no onRetry is provided', () => {
    const { queryByLabelText } = render(<ScreenState variant="error" message="Boom" />);
    expect(queryByLabelText('Try again')).toBeNull();
  });
});
