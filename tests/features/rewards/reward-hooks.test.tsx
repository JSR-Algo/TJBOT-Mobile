import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getRewardHistory, getRewardInbox } from '@/services/api/rewards.api';
import { getLeaderboard } from '@/services/api/leaderboard.api';
import { rewardKeys, shouldQueueSeenAcknowledgement, useLeaderboardQuery, useRewardHistoryQuery, useRewardInboxQuery } from '@/features/rewards/hooks/useRewards';
import { setRewardQueueScope } from '@/features/rewards/offline/rewardSeenQueue';

jest.mock('@/services/api/rewards.api', () => ({ getRewardHistory: jest.fn(), getRewardInbox: jest.fn(), acknowledgeRewardSeen: jest.fn() }));
jest.mock('@/services/api/leaderboard.api', () => ({ getLeaderboard: jest.fn(), updateLeaderboardPreference: jest.fn() }));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));

const mockHistory = getRewardHistory as jest.MockedFunction<typeof getRewardHistory>;
const mockInbox = getRewardInbox as jest.MockedFunction<typeof getRewardInbox>;
const mockLeaderboard = getLeaderboard as jest.MockedFunction<typeof getLeaderboard>;

function wrapper(): React.ComponentType<React.PropsWithChildren> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: React.PropsWithChildren): React.JSX.Element => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('authoritative reward hooks', () => {
  beforeEach(() => { jest.clearAllMocks(); setRewardQueueScope('parent-1', 'house-1'); });

  it('partitions keys by authenticated account, child, device, period and page', () => {
    expect(rewardKeys.history('parent-1', 'house-1', 'c1', 'r1')).not.toEqual(rewardKeys.history('parent-2', 'house-1', 'c1', 'r1'));
    expect(rewardKeys.history('parent-1', 'house-1', 'c1', 'r1')).not.toEqual(rewardKeys.history('parent-1', 'house-2', 'c1', 'r1'));
    expect(rewardKeys.totals('parent-1', 'house-1', 'c1', 'r1')).not.toEqual(rewardKeys.history('parent-1', 'house-1', 'c1', 'r1'));
    expect(rewardKeys.leaderboard('parent-1', 'house-1', 'weekly', 1, 20)).not.toEqual(rewardKeys.leaderboard('parent-1', 'house-1', 'allTime', 1, 20));
  });

  it('loads private history with exact optional filters', async () => {
    mockHistory.mockResolvedValueOnce({ totals: { xp: 0, coins: 0, rewardCount: 0, refreshing: false }, history: [] });
    const { result } = renderHook(() => useRewardHistoryQuery('house-1', 'child-1', 'robot-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockHistory).toHaveBeenCalledWith({ childId: 'child-1', deviceId: 'robot-1' });
  });

  it('loads the account-scoped inbox without private selectors', async () => {
    mockInbox.mockResolvedValueOnce({ rewards: [], count: 0 });
    const { result } = renderHook(() => useRewardInboxQuery('house-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInbox).toHaveBeenCalledWith();
  });

  it('loads exact leaderboard pages independently', async () => {
    mockLeaderboard.mockResolvedValueOnce({ period: 'weekly', rows: [], ownedRows: [], pagination: { page: 2, pageSize: 10, totalRows: 0, totalPages: 0 } });
    const { result } = renderHook(() => useLeaderboardQuery('house-1', 'weekly', 2, 10), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLeaderboard).toHaveBeenCalledWith({ period: 'weekly', page: 2, pageSize: 10 });
  });

  it('queues only retryable acknowledgement failures', () => {
    expect(shouldQueueSeenAcknowledgement({ code: 'NETWORK_ERROR', message: 'offline', retryable: true })).toBe(true);
    expect(shouldQueueSeenAcknowledgement({ code: 'SERVICE_UNAVAILABLE', message: 'later', retryable: true, status: 503 })).toBe(true);
    expect(shouldQueueSeenAcknowledgement({ code: 'RATE_LIMIT_EXCEEDED', message: 'later', retryable: true, status: 429 })).toBe(true);
    expect(shouldQueueSeenAcknowledgement({ code: 'FORBIDDEN', message: 'no', retryable: false, status: 403 })).toBe(false);
    expect(shouldQueueSeenAcknowledgement({ code: 'INVALID_API_RESPONSE', message: 'bad', retryable: false })).toBe(false);
  });
});
