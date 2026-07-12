import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getDeviceStatus, type DeviceStatus } from '@/services/api/device.api';
import {
  acknowledgeRewardSeen,
  getLeaderboard,
  getLeaderboardPreference,
  getRewardHistory,
  getRewardForCompletion,
  getRewardInbox,
  getRewardTotals,
  updateLeaderboardPreference,
  type LeaderboardPeriod,
  type LessonReward,
  type RewardTotals,
} from '@/services/api/rewards.api';
import { enqueueRewardSeen } from '@/features/rewards/offline/rewardSeenQueue';
import { appQueryClient } from '@/services/query/queryClient';

export const rewardKeys = {
  all: ['rewards'] as const,
  device: (childId: string | undefined) => ['device', 'active-child', childId] as const,
  inbox: (childId: string | undefined, deviceId: string | undefined, assignmentId: string | undefined) =>
    ['rewards', 'inbox', childId, deviceId, assignmentId] as const,
  totals: (childId: string | undefined) => ['rewards', 'totals', childId] as const,
  history: (childId: string | undefined) => ['rewards', 'history', childId] as const,
  leaderboard: (period: LeaderboardPeriod, deviceId?: string) => ['rewards', 'leaderboard', period, deviceId] as const,
  preference: (deviceId: string | undefined) => ['rewards', 'leaderboard-preference', deviceId] as const,
  completion: (childId: string | undefined, deviceId: string | undefined, assignmentId: string | undefined) =>
    ['rewards', 'completion', childId, deviceId, assignmentId] as const,
};

export function useActiveChildRobotQuery(childId: string | undefined): UseQueryResult<DeviceStatus, Error> {
  const enabled = typeof childId === 'string' && childId.length > 0;
  return useQuery({
    queryKey: rewardKeys.device(childId),
    queryFn: () => getDeviceStatus('primary', childId),
    enabled,
    staleTime: 30_000,
  }, appQueryClient);
}

export function useRewardInboxQuery(params: {
  childId?: string;
  deviceId?: string;
  assignmentId?: string;
}): UseQueryResult<LessonReward[], Error> {
  const enabled = Boolean(params.childId && params.deviceId && params.assignmentId);
  return useQuery({
    queryKey: rewardKeys.inbox(params.childId, params.deviceId, params.assignmentId),
    queryFn: () => getRewardInbox({
      childId: params.childId ?? '',
      deviceId: params.deviceId ?? '',
      assignmentId: params.assignmentId ?? '',
    }),
    enabled,
    refetchInterval: (query) => query.state.data?.length ? false : 2_000,
  });
}

export function useRewardForCompletionQuery(params: {
  childId?: string;
  deviceId?: string;
  assignmentId?: string;
}): UseQueryResult<LessonReward | null, Error> {
  const enabled = Boolean(params.childId && params.deviceId && params.assignmentId);
  return useQuery({
    queryKey: rewardKeys.completion(params.childId, params.deviceId, params.assignmentId),
    queryFn: () => getRewardForCompletion({
      childId: params.childId ?? '',
      deviceId: params.deviceId ?? '',
      assignmentId: params.assignmentId ?? '',
    }),
    enabled,
    refetchInterval: query => query.state.data ? false : 2_000,
  }, appQueryClient);
}

export function useRewardTotalsQuery(childId: string | undefined): UseQueryResult<RewardTotals, Error> {
  return useQuery({
    queryKey: rewardKeys.totals(childId),
    queryFn: () => getRewardTotals(childId ?? ''),
    enabled: Boolean(childId),
  });
}

export function useRewardHistoryQuery(childId: string | undefined) {
  return useInfiniteQuery({
    queryKey: rewardKeys.history(childId),
    queryFn: ({ pageParam }) => getRewardHistory({ childId: childId ?? '', cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: Boolean(childId),
  });
}

export function useLeaderboardQuery(period: LeaderboardPeriod, deviceId?: string) {
  return useInfiniteQuery({
    queryKey: rewardKeys.leaderboard(period, deviceId),
    queryFn: ({ pageParam }) => getLeaderboard({ period, deviceId, cursor: pageParam, limit: 25 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
}

export function useLeaderboardPreferenceQuery(deviceId: string | undefined) {
  return useQuery({
    queryKey: rewardKeys.preference(deviceId),
    queryFn: () => getLeaderboardPreference(deviceId ?? ''),
    enabled: Boolean(deviceId),
  });
}

export function useAcknowledgeRewardMutation() {
  return useMutation({
    mutationFn: acknowledgeRewardSeen,
    onError: async (_error, rewardId) => {
      await enqueueRewardSeen(rewardId);
    },
    onSuccess: () => appQueryClient.invalidateQueries({ queryKey: rewardKeys.all }),
  }, appQueryClient);
}

export function useLeaderboardPreferenceMutation(deviceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optedIn: boolean) => updateLeaderboardPreference(deviceId ?? '', optedIn),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rewardKeys.preference(deviceId) }),
        queryClient.invalidateQueries({ queryKey: ['rewards', 'leaderboard', 'weekly'] }),
        queryClient.invalidateQueries({ queryKey: ['rewards', 'leaderboard', 'allTime'] }),
      ]);
    },
  });
}
