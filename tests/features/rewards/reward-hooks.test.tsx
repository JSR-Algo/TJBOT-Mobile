import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { acknowledgeRewardSeen, getRewardHistory, getRewardInbox } from '@/services/api/rewards.api';
import { getLeaderboard } from '@/services/api/leaderboard.api';
import { rewardKeys, shouldQueueSeenAcknowledgement, useAcknowledgeRewardMutation, useLeaderboardQuery, useRewardHistoryQuery, useRewardInboxQuery } from '@/features/rewards/hooks/useRewards';
import { isRewardSeenQueued, setRewardQueueScope } from '@/features/rewards/offline/rewardSeenQueue';

jest.mock('@/services/api/rewards.api', () => ({ getRewardHistory: jest.fn(), getRewardInbox: jest.fn(), acknowledgeRewardSeen: jest.fn() }));
jest.mock('@/services/api/leaderboard.api', () => ({ getLeaderboard: jest.fn(), updateLeaderboardPreference: jest.fn() }));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));

const mockHistory = getRewardHistory as jest.MockedFunction<typeof getRewardHistory>;
const mockInbox = getRewardInbox as jest.MockedFunction<typeof getRewardInbox>;
const mockLeaderboard = getLeaderboard as jest.MockedFunction<typeof getLeaderboard>;
const mockAcknowledge = acknowledgeRewardSeen as jest.MockedFunction<typeof acknowledgeRewardSeen>;
type MutationScopeProps = { householdScope: string; accountId: string };

function wrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })): React.ComponentType<React.PropsWithChildren> {
  return ({ children }: React.PropsWithChildren): React.JSX.Element => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('authoritative reward hooks', () => {
  beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); setRewardQueueScope('parent-1', 'house-1'); });

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

  it('does not inherit the previous global account when an explicit account scope is absent', () => {
    setRewardQueueScope('previous-parent', 'house-1');
    const { result } = renderHook(() => useRewardInboxQuery('house-1', null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockInbox).not.toHaveBeenCalled();
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

  it('queues a delayed acknowledgement failure in the mutation scope captured at creation', async () => {
    let rejectAcknowledgement: (error: Error) => void = () => undefined;
    mockAcknowledge.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectAcknowledgement = reject; }));
    const { result, rerender } = renderHook<ReturnType<typeof useAcknowledgeRewardMutation>, MutationScopeProps>(
      ({ householdScope, accountId }) => useAcknowledgeRewardMutation(householdScope, accountId),
      { initialProps: { householdScope: 'house-1', accountId: 'parent-1' }, wrapper: wrapper() },
    );
    let mutation: Promise<unknown> = Promise.resolve();
    act(() => { mutation = result.current.mutateAsync('reward-delayed'); });
    await waitFor(() => expect(mockAcknowledge.mock.calls[0]?.[0]).toBe('reward-delayed'));

    rerender({ householdScope: 'house-2', accountId: 'parent-2' });
    setRewardQueueScope('parent-2', 'house-2');
    await act(async () => {
      rejectAcknowledgement(Object.assign(new Error('offline'), { code: 'NETWORK_ERROR', retryable: true }));
      await expect(mutation).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await expect(isRewardSeenQueued('reward-delayed', { accountId: 'parent-1', householdScope: 'house-1' })).resolves.toBe(true);
    await expect(isRewardSeenQueued('reward-delayed', { accountId: 'parent-2', householdScope: 'house-2' })).resolves.toBe(false);
  });

  it('invalidates the invocation scope when a delayed acknowledgement succeeds after rerender', async () => {
    let resolveAcknowledgement: (value: { rewardId: string; seen: true; seenAt: string }) => void = () => undefined;
    mockAcknowledge.mockImplementationOnce(() => new Promise(resolve => { resolveAcknowledgement = resolve; }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const { result, rerender } = renderHook<ReturnType<typeof useAcknowledgeRewardMutation>, MutationScopeProps>(
      ({ householdScope, accountId }) => useAcknowledgeRewardMutation(householdScope, accountId),
      { initialProps: { householdScope: 'house-1', accountId: 'parent-1' }, wrapper: wrapper(queryClient) },
    );
    let mutation: Promise<unknown> = Promise.resolve();
    act(() => { mutation = result.current.mutateAsync('reward-success'); });
    await waitFor(() => expect(mockAcknowledge.mock.calls[0]?.[0]).toBe('reward-success'));

    rerender({ householdScope: 'house-2', accountId: 'parent-2' });
    await act(async () => {
      resolveAcknowledgement({ rewardId: 'reward-success', seen: true, seenAt: '2026-07-15T00:00:00.000Z' });
      await mutation;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: rewardKeys.scope('parent-1', 'house-1') });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: rewardKeys.scope('parent-2', 'house-2') });
  });
});
