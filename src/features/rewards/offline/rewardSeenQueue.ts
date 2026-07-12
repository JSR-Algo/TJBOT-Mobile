import AsyncStorage from '@react-native-async-storage/async-storage';
import { acknowledgeRewardSeen } from '@/services/api/rewards.api';
import { captureError } from '@/services/observability/sentry';

const REWARD_SEEN_QUEUE_PREFIX = '@TJBot/reward_seen_queue';
let activeAccountId: string | null = null;

export function setRewardQueueAccount(accountId: string | null): void {
  activeAccountId = accountId?.trim() || null;
}

function queueKey(accountId: string | null = activeAccountId): string {
  if (!accountId) throw new Error('REWARD_QUEUE_ACCOUNT_REQUIRED');
  return `${REWARD_SEEN_QUEUE_PREFIX}/${encodeURIComponent(accountId)}`;
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

export async function replayRewardSeenQueue(): Promise<void> {
  if (!activeAccountId) return;
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

export async function clearRewardSeenQueue(accountId: string | null = activeAccountId): Promise<void> {
  if (!accountId) return;
  await AsyncStorage.removeItem(queueKey(accountId));
}
