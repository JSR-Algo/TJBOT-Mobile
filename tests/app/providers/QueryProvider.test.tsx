import React from 'react';
import { View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { captureError } from '@/services/observability/sentry';

jest.mock('@/services/observability/sentry', () => ({
  captureError: jest.fn(),
}));

function FailingQuery({ error, queryKey }: { error: unknown; queryKey: string }) {
  useQuery({
    queryKey: ['query-provider-test', queryKey],
    queryFn: async () => {
      throw error;
    },
    retry: false,
  });
  return <View testID={`failing-${queryKey}`} />;
}

describe('QueryProvider', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleError.mockRestore();
    consoleInfo.mockRestore();
  });

  it('renders children inside the React Query provider', () => {
    const { getByTestId } = render(
      <QueryProvider>
        <View testID="child" />
      </QueryProvider>,
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('keeps expected auth query failures out of the dev redbox and Sentry', async () => {
    const screen = render(
      <QueryProvider>
        <FailingQuery error={new Error('No refresh token')} queryKey="auth" />
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(consoleInfo).toHaveBeenCalledWith('[QueryProvider] %s %s:', 'query', 'handled error', 'No refresh token');
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(captureError).not.toHaveBeenCalled();
    screen.unmount();
  });

  it('still reports unexpected query failures', async () => {
    const error = new Error('unexpected render-time fetch failure');
    const screen = render(
      <QueryProvider>
        <FailingQuery error={error} queryKey="unexpected" />
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[QueryProvider] %s %s:',
        'query',
        'unexpected error',
        'unexpected render-time fetch failure',
      );
    });
    expect(captureError).toHaveBeenCalledWith(error);
    screen.unmount();
  });
});
