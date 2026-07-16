import AsyncStorage from '@react-native-async-storage/async-storage';
import { acknowledgeRewardSeen } from '@/services/api/rewards.api';
import { captureError } from '@/services/observability/sentry';

const REWARD_SEEN_QUEUE_PREFIX = '@TJBot/reward_seen_queue';
let activeAccountId: string | null = null;
let activeHouseholdScope: string | null = null;

export function setRewardQueueAccount(accountId: string | null): void {
  setRewardQueueScope(accountId, null);
}

export function setRewardQueueScope(accountId: string | null, householdScope: string | null): void {
  activeAccountId = accountId?.trim() || null;
  activeHouseholdScope = householdScope?.trim() || null;
}

export function getRewardQueueScope(): { accountId: string; householdScope: string } {
  return { accountId: activeAccountId ?? 'anonymous', householdScope: activeHouseholdScope ?? 'no-household' };
}

function queueKey(accountId: string | null = activeAccountId, householdScope: string | null = activeHouseholdScope): string {
  if (!accountId || !householdScope) throw new Error('REWARD_QUEUE_SCOPE_REQUIRED');
  return `${REWARD_SEEN_QUEUE_PREFIX}/${encodeURIComponent(accountId)}/${encodeURIComponent(householdScope)}`;
}

async function readQueue(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(queueKey());
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

async function writeQueue(queue: string[]): Promise<void> {
  await AsyncStorage.setItem(queueKey(), JSON.stringify(queue));
}

export async function enqueueRewardSeen(rewardId: string): Promise<void> {
  const queue = await readQueue();
  if (queue.includes(rewardId)) return;
  await writeQueue([...queue, rewardId]);
}

export async function isRewardSeenQueued(rewardId: string): Promise<boolean> {
  return (await readQueue()).includes(rewardId);
}

export async function replayRewardSeenQueue(): Promise<void> {
  if (!activeAccountId || !activeHouseholdScope) return;
  const queue = await readQueue();
  const remaining: string[] = [];
  for (const rewardId of queue) {
    try {
      await acknowledgeRewardSeen(rewardId);
    } catch (error) {
      captureError(error);
      remaining.push(rewardId);
    }
  }
  await writeQueue(remaining);
}

export async function clearRewardSeenQueue(accountId: string | null = activeAccountId, householdScope: string | null = activeHouseholdScope): Promise<void> {
  if (!accountId || !householdScope) return;
  await AsyncStorage.removeItem(queueKey(accountId, householdScope));
}
