import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parentSessionReportKey, useParentSessionReportQuery } from '@/features/parent/hooks/useParentSessionReportQuery';
import { getParentSessionReport } from '@/services/api/parentLearning.api';

jest.mock('@/services/api/parentLearning.api', () => ({ getParentSessionReport: jest.fn() }));
const mockReport = getParentSessionReport as jest.MockedFunction<typeof getParentSessionReport>;

it('uses the canonical report key and fetches only with both ids', async () => {
  mockReport.mockResolvedValue({ childId: 'c', sessionId: 's' } as Awaited<ReturnType<typeof getParentSessionReport>>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  expect(parentSessionReportKey('c', 's')).toEqual(['parent-session-report', 'c', 's']);
  const { result } = renderHook(() => useParentSessionReportQuery('c', 's'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockReport).toHaveBeenCalledWith('c', 's');
});
