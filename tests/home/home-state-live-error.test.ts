import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHomeState } from '@/features/home/hooks/useHomeState';

jest.mock('@/services/api/home.api', () => ({
  HOME_BACKEND_CONTRACT_AVAILABLE: true,
  getHomeHub: jest.fn(async () => {
    throw new Error('Network Error');
  }),
}));

jest.mock('@/config/investorDemo', () => ({
  getDemoBadgeState: () => ({ simulated: false, label: null }),
}));

describe('useHomeState live query failure', () => {
  it('exposes error contentMode instead of fabricating live ready content', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result, unmount } = renderHook(() => useHomeState(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.homeContractAvailable).toBe(true);
    expect(result.current.contentMode).toBe('error');
    expect(result.current.variant).toBe('error');
    expect(result.current.data).toBeUndefined();
    expect(result.current.cfg.ctaLabel).toBe('Retry Home');

    unmount();
    queryClient.clear();
  });
});
