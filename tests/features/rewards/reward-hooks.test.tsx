import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDeviceStatus } from '@/services/api/device.api';
import { getRewardInbox, getRewardTotals } from '@/services/api/rewards.api';
import {
  rewardKeys,
  useActiveChildRobotQuery,
  useRewardInboxQuery,
  useRewardTotalsQuery,
} from '@/features/rewards/hooks/useRewards';

jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));
jest.mock('@/services/api/rewards.api', () => ({
  getRewardInbox: jest.fn(),
  getRewardTotals: jest.fn(),
  getRewardHistory: jest.fn(),
  getLeaderboard: jest.fn(),
  getLeaderboardPreference: jest.fn(),
  updateLeaderboardPreference: jest.fn(),
  acknowledgeRewardSeen: jest.fn(),
}));

const mockGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockGetRewardInbox = getRewardInbox as jest.MockedFunction<typeof getRewardInbox>;
const mockGetRewardTotals = getRewardTotals as jest.MockedFunction<typeof getRewardTotals>;

function wrapper(): React.ComponentType<React.PropsWithChildren> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return function TestProvider({ children }: React.PropsWithChildren): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('reward hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('isolates reward query keys by child, robot, assignment and period', () => {
    expect(rewardKeys.inbox('c1', 'r1', 'a1')).not.toEqual(rewardKeys.inbox('c2', 'r1', 'a1'));
    expect(rewardKeys.leaderboard('weekly', 'r1')).not.toEqual(rewardKeys.leaderboard('allTime', 'r1'));
  });

  it('does not request a robot until an active child exists', () => {
    const { result } = renderHook(() => useActiveChildRobotQuery(undefined), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDeviceStatus).not.toHaveBeenCalled();
  });

  it('resolves the primary robot using the active child id', async () => {
    mockGetDeviceStatus.mockResolvedValueOnce({ id: 'robot-2', name: 'Tee', online: true, batteryPercent: 80, assignedChildProfileId: 'child-2' });
    const { result } = renderHook(() => useActiveChildRobotQuery('child-2'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetDeviceStatus).toHaveBeenCalledWith('primary', 'child-2');
  });

  it('requests only the exact assignment reward', async () => {
    mockGetRewardInbox.mockResolvedValueOnce([]);
    const { result } = renderHook(
      () => useRewardInboxQuery({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assign-1' }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRewardInbox).toHaveBeenCalledWith({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assign-1' });
  });

  it('loads private totals only for the active child', async () => {
    mockGetRewardTotals.mockResolvedValueOnce({ childId: 'child-1', totalXp: 10, totalCoins: 2, lessonCompletions: 1, currentStreakDays: 1, badgeCount: 0, longestStreakDays: 1 });
    const { result } = renderHook(() => useRewardTotalsQuery('child-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.totalXp).toBe(10));
    expect(mockGetRewardTotals).toHaveBeenCalledWith('child-1');
  });
});
