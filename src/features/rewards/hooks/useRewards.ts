import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDeviceStatus, type DeviceStatus } from '@/services/api/device.api';
import { acknowledgeRewardSeen, getRewardHistory, getRewardInbox, type RewardHistory, type RewardInbox, type RewardTotals } from '@/services/api/rewards.api';
import { getLeaderboard, updateLeaderboardPreference, type LeaderboardPage, type LeaderboardPeriod } from '@/services/api/leaderboard.api';
import { updateChildDisplayName } from '@/services/api/households';
import { enqueueRewardSeen, getRewardQueueScope } from '@/features/rewards/offline/rewardSeenQueue';
import { appQueryClient } from '@/services/query/queryClient';
import type { AppError } from '@/utils/errors';

export const rewardKeys = {
  all: ['rewards'] as const,
  scope: (accountId: string, householdScope: string) => ['rewards', 'account', accountId, 'household', householdScope] as const,
  device: (childId?: string) => ['device', 'active-child', childId] as const,
  inbox: (accountId: string, householdScope: string) => [...rewardKeys.scope(accountId, householdScope), 'inbox'] as const,
  totals: (accountId: string, householdScope: string, childId?: string, deviceId?: string) => [...rewardKeys.scope(accountId, householdScope), 'totals', childId, deviceId] as const,
  history: (accountId: string, householdScope: string, childId?: string, deviceId?: string) => [...rewardKeys.scope(accountId, householdScope), 'history', childId, deviceId] as const,
  leaderboard: (accountId: string, householdScope: string, period: LeaderboardPeriod, page: number, pageSize: number) => [...rewardKeys.scope(accountId, householdScope), 'leaderboard', period, page, pageSize] as const,
  preference: (accountId: string, householdScope: string, deviceId?: string) => [...rewardKeys.scope(accountId, householdScope), 'leaderboard-preference', deviceId] as const,
};

function scope(householdScope: string): { accountId: string; householdScope: string } {
  const active = getRewardQueueScope();
  return { accountId: active.accountId, householdScope };
}

export function shouldQueueSeenAcknowledgement(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('code' in error)) return false;
  const appError = error as AppError;
  if (appError.code === 'NETWORK_ERROR') return true;
  if (appError.retryable !== true) return false;
  return appError.status === 429 || (typeof appError.status === 'number' && appError.status >= 500);
}

export function useActiveChildRobotQuery(childId?: string): UseQueryResult<DeviceStatus, Error> {
  return useQuery({ queryKey: rewardKeys.device(childId), queryFn: () => getDeviceStatus('primary', childId), enabled: Boolean(childId), staleTime: 30_000 }, appQueryClient);
}
export function useRewardHistoryQuery(householdScope: string, childId?: string, deviceId?: string): UseQueryResult<RewardHistory, Error> {
  const current = scope(householdScope);
  return useQuery({ queryKey: rewardKeys.history(current.accountId, current.householdScope, childId, deviceId), queryFn: () => getRewardHistory({ childId, deviceId }), enabled: Boolean(householdScope) });
}
export function useRewardTotalsQuery(householdScope: string, childId?: string, deviceId?: string): UseQueryResult<RewardTotals, Error> {
  const current = scope(householdScope);
  return useQuery({ queryKey: rewardKeys.totals(current.accountId, current.householdScope, childId, deviceId), queryFn: async () => (await getRewardHistory({ childId, deviceId })).totals, enabled: Boolean(householdScope) });
}
export function useRewardInboxQuery(householdScope: string): UseQueryResult<RewardInbox, Error> {
  const current = scope(householdScope);
  return useQuery({ queryKey: rewardKeys.inbox(current.accountId, current.householdScope), queryFn: () => getRewardInbox(), enabled: Boolean(householdScope) });
}
export function useLeaderboardQuery(householdScope: string, period: LeaderboardPeriod, page = 1, pageSize = 25): UseQueryResult<LeaderboardPage, Error> {
  const current = scope(householdScope);
  return useQuery({ queryKey: rewardKeys.leaderboard(current.accountId, current.householdScope, period, page, pageSize), queryFn: () => getLeaderboard({ period, page, pageSize }), enabled: Boolean(householdScope) });
}
export function useLeaderboardPreferenceMutation(householdScope: string, deviceId?: string) {
  const queryClient = useQueryClient(); const current = scope(householdScope);
  return useMutation({ mutationFn: (optedIn: boolean) => updateLeaderboardPreference(deviceId ?? '', optedIn), onSuccess: async () => queryClient.invalidateQueries({ queryKey: rewardKeys.scope(current.accountId, current.householdScope) }) });
}
export function useAcknowledgeRewardMutation(householdScope: string) {
  const queryClient = useQueryClient(); const current = scope(householdScope);
  return useMutation({ mutationFn: acknowledgeRewardSeen, onError: async (error, rewardId) => { if (shouldQueueSeenAcknowledgement(error)) await enqueueRewardSeen(rewardId); }, onSuccess: async () => queryClient.invalidateQueries({ queryKey: rewardKeys.scope(current.accountId, current.householdScope) }) });
}
export function useUpdateChildDisplayNameMutation(householdScope: string, childId?: string) {
  const queryClient = useQueryClient(); const current = scope(householdScope);
  return useMutation({ mutationFn: (displayName: string) => updateChildDisplayName(childId ?? '', displayName), onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: rewardKeys.scope(current.accountId, current.householdScope) }), queryClient.invalidateQueries({ queryKey: rewardKeys.device(childId) })]).then(() => undefined) });
}
