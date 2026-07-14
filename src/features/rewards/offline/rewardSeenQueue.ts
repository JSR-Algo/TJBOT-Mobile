import AsyncStorage from '@react-native-async-storage/async-storage';
import { acknowledgeRewardSeen } from '@/services/api/rewards.api';
import { captureError } from '@/services/observability/sentry';

const REWARD_SEEN_QUEUE_PREFIX = '@TJBot/reward_seen_queue';
let activeAccountId: string | null = null;
let activeHouseholdScope: string | null = null;
let storageOperations: Promise<void> = Promise.resolve();

export type RewardQueueScope = Readonly<{ accountId: string; householdScope: string }>;

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

function resolveScope(scope?: RewardQueueScope): RewardQueueScope {
  if (scope) return scope;
  if (!activeAccountId || !activeHouseholdScope) throw new Error('REWARD_QUEUE_SCOPE_REQUIRED');
  return { accountId: activeAccountId, householdScope: activeHouseholdScope };
}

function queueKey(scope: RewardQueueScope): string {
  return `${REWARD_SEEN_QUEUE_PREFIX}/${encodeURIComponent(scope.accountId)}/${encodeURIComponent(scope.householdScope)}`;
}

function serializeStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageOperations.then(operation);
  storageOperations = result.then(() => undefined, () => undefined);
  return result;
}

async function readQueue(scope: RewardQueueScope): Promise<string[]> {
  const raw = await AsyncStorage.getItem(queueKey(scope));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

async function writeQueue(queue: string[], scope: RewardQueueScope): Promise<void> {
  await AsyncStorage.setItem(queueKey(scope), JSON.stringify(queue));
}

export async function enqueueRewardSeen(rewardId: string, scope?: RewardQueueScope): Promise<void> {
  const operationScope = resolveScope(scope);
  await serializeStorage(async () => {
    const queue = await readQueue(operationScope);
    if (queue.includes(rewardId)) return;
    await writeQueue([...queue, rewardId], operationScope);
  });
}

export async function isRewardSeenQueued(rewardId: string, scope?: RewardQueueScope): Promise<boolean> {
  const operationScope = resolveScope(scope);
  return serializeStorage(async () => (await readQueue(operationScope)).includes(rewardId));
}

export async function replayRewardSeenQueue(): Promise<void> {
  if (!activeAccountId || !activeHouseholdScope) return;
  const scope = { accountId: activeAccountId, householdScope: activeHouseholdScope };
  const snapshot = await serializeStorage(() => readQueue(scope));
  const acknowledged = new Set<string>();
  for (const rewardId of snapshot) {
    try {
      await acknowledgeRewardSeen(rewardId);
      acknowledged.add(rewardId);
    } catch (error) {
      captureError(error);
    }
  }
  await serializeStorage(async () => {
    const latest = await readQueue(scope);
    await writeQueue(latest.filter(rewardId => !acknowledged.has(rewardId)), scope);
  });
}

export async function clearRewardSeenQueue(accountId: string | null = activeAccountId, householdScope: string | null = activeHouseholdScope): Promise<void> {
  if (!accountId || !householdScope) return;
  const scope = { accountId, householdScope };
  await serializeStorage(() => AsyncStorage.removeItem(queueKey(scope)));
}
