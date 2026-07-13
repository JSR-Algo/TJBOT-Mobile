import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDeviceStatus, type DeviceStatus } from '@/services/api/device.api';
import { acknowledgeRewardSeen, getRewardHistory, getRewardInbox, type RewardReceipt, type RewardTotals } from '@/services/api/rewards.api';
import { getLeaderboard, updateLeaderboardPreference, type LeaderboardPeriod } from '@/services/api/leaderboard.api';
import { updateChildDisplayName } from '@/services/api/households';
import { enqueueRewardSeen, getRewardQueueAccount } from '@/features/rewards/offline/rewardSeenQueue';
import { appQueryClient } from '@/services/query/queryClient';

export const rewardKeys = {
  all: ['rewards'] as const,
  account: (accountId: string) => ['rewards', 'account', accountId] as const,
  device: (childId: string | undefined) => ['device', 'active-child', childId] as const,
  inbox: (accountId: string) => ['rewards', 'account', accountId, 'inbox'] as const,
  history: (accountId: string, childId?: string, deviceId?: string) => ['rewards', 'account', accountId, 'history', childId, deviceId] as const,
  leaderboard: (accountId: string, period: LeaderboardPeriod, page: number, pageSize: number) => ['rewards', 'account', accountId, 'leaderboard', period, page, pageSize] as const,
  preference: (accountId: string, deviceId?: string) => ['rewards', 'account', accountId, 'leaderboard-preference', deviceId] as const,
  completion: (accountId: string, childId?: string, deviceId?: string, assignmentId?: string) => ['rewards', 'account', accountId, 'completion', childId, deviceId, assignmentId] as const,
};

export function useActiveChildRobotQuery(childId: string | undefined): UseQueryResult<DeviceStatus, Error> {
  return useQuery({ queryKey: rewardKeys.device(childId), queryFn: () => getDeviceStatus('primary', childId), enabled: Boolean(childId), staleTime: 30_000 }, appQueryClient);
}

export function useRewardHistoryQuery(childId?: string, deviceId?: string) {
  const accountId = getRewardQueueAccount();
  return useInfiniteQuery({
    queryKey: rewardKeys.history(accountId, childId, deviceId),
    queryFn: async () => {
      const result = await getRewardHistory({ childId, deviceId });
      return result;
    },
    initialPageParam: undefined,
    getNextPageParam: () => undefined,
  });
}

export function useRewardTotalsQuery(childId?: string): UseQueryResult<RewardTotals, Error> {
  const accountId = getRewardQueueAccount();
  return useQuery({
    queryKey: rewardKeys.history(accountId, childId),
    queryFn: async () => (await getRewardHistory({ childId })).totals,
    enabled: Boolean(childId),
  });
}

export function useRewardInboxQuery(): UseQueryResult<{ rewards: RewardReceipt[]; count: number }, Error> {
  const accountId = getRewardQueueAccount();
  return useQuery({ queryKey: rewardKeys.inbox(accountId), queryFn: () => getRewardInbox() });
}

export function useRewardForCompletionQuery(params: { childId?: string; deviceId?: string; assignmentId?: string }): UseQueryResult<RewardReceipt | null, Error> {
  const accountId = getRewardQueueAccount();
  return useQuery({
    queryKey: rewardKeys.completion(accountId, params.childId, params.deviceId, params.assignmentId),
    queryFn: async () => {
      const inbox = await getRewardInbox();
      return inbox.rewards.find(reward => reward.child.id === params.childId && reward.robot.id === params.deviceId) ?? null;
    },
    enabled: Boolean(params.childId && params.deviceId),
    refetchInterval: query => query.state.data ? false : 2_000,
  }, appQueryClient);
}

export function useLeaderboardQuery(period: LeaderboardPeriod, pageOrDevice: number | string = 1, pageSize = 25) {
  const accountId = getRewardQueueAccount();
  const initialPage = typeof pageOrDevice === 'number' ? pageOrDevice : 1;
  return useInfiniteQuery({
    queryKey: rewardKeys.leaderboard(accountId, period, initialPage, pageSize),
    queryFn: ({ pageParam }) => getLeaderboard({ period, page: pageParam, pageSize }),
    initialPageParam: initialPage,
    getNextPageParam: page => page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
  });
}

export function useLeaderboardPreferenceQuery(deviceId?: string): UseQueryResult<{ robotId: string; optedIn: boolean }, Error> {
  const accountId = getRewardQueueAccount();
  return useQuery({
    queryKey: rewardKeys.preference(accountId, deviceId),
    queryFn: async () => {
      const page = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 50 });
      const row = page.ownedRows.find(item => item.robotId === deviceId);
      if (!row) throw { code: 'INVALID_API_RESPONSE', message: 'Owned robot missing from leaderboard response.', retryable: false };
      return { robotId: row.robotId, optedIn: row.optedIn };
    },
    enabled: Boolean(deviceId),
  });
}

export function useAcknowledgeRewardMutation() {
  const queryClient = useQueryClient();
  const accountId = getRewardQueueAccount();
  return useMutation({
    mutationFn: acknowledgeRewardSeen,
    onError: async (_error, rewardId) => enqueueRewardSeen(rewardId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: rewardKeys.account(accountId) }),
  });
}

export function useLeaderboardPreferenceMutation(deviceId?: string) {
  const queryClient = useQueryClient();
  const accountId = getRewardQueueAccount();
  return useMutation({
    mutationFn: (optedIn: boolean) => updateLeaderboardPreference(deviceId ?? '', optedIn),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: rewardKeys.account(accountId) }),
  });
}

export function useUpdateChildDisplayNameMutation(childId?: string) {
  const queryClient = useQueryClient();
  const accountId = getRewardQueueAccount();
  return useMutation({
    mutationFn: (displayName: string) => updateChildDisplayName(childId ?? '', displayName),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rewardKeys.account(accountId) }),
        queryClient.invalidateQueries({ queryKey: rewardKeys.device(childId) }),
      ]);
    },
  });
}
