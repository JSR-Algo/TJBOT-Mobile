import client from '@/services/http/client';
import type { AppError } from '@/utils/errors';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface RewardParty { id: string; displayName: string | null }
export interface RewardStreak { currentDays: number | null; bestDays: number | null }
export interface RewardReceipt {
  rewardId: string;
  child: RewardParty;
  robot: RewardParty;
  xp: number;
  coins: number;
  badges: string[];
  reason: JsonValue;
  policyVersion: string | null;
  streak: RewardStreak | null;
  awardedAt: string;
}
export interface RewardTotals { xp: number; coins: number; rewardCount: number; refreshing: boolean }
export interface RewardHistory { totals: RewardTotals; history: RewardReceipt[] }
export interface RewardInbox { rewards: RewardReceipt[]; count: number }
export interface SeenReward { rewardId: string; seen: true; seenAt: string }

type RecordValue = Record<string, unknown>;

function invalid(path: string): AppError {
  return { code: 'INVALID_API_RESPONSE', message: `Invalid rewards response at ${path}.`, retryable: false };
}

function objectAt(value: unknown, path: string): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalid(path);
  return value as RecordValue;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw invalid(path);
  return value;
}

function nullableStringAt(value: unknown, path: string): string | null {
  if (value === null) return null;
  return stringAt(value, path);
}

function integerAt(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw invalid(path);
  return value as number;
}

function nullableIntegerAt(value: unknown, path: string): number | null {
  return value === null ? null : integerAt(value, path);
}

function jsonAt(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item, index) => jsonAt(item, `${path}[${index}]`));
  const source = objectAt(value, path);
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, jsonAt(item, `${path}.${key}`)]));
}

function dataAt(value: unknown): unknown {
  return objectAt(value, 'response').data;
}

function partyAt(value: unknown, path: string): RewardParty {
  const item = objectAt(value, path);
  return { id: stringAt(item.id, `${path}.id`), displayName: nullableStringAt(item.displayName, `${path}.displayName`) };
}

function streakAt(value: unknown, path: string): RewardStreak | null {
  if (value === null) return null;
  const item = objectAt(value, path);
  return {
    currentDays: nullableIntegerAt(item.currentDays, `${path}.currentDays`),
    bestDays: nullableIntegerAt(item.bestDays, `${path}.bestDays`),
  };
}

function receiptAt(value: unknown, path: string): RewardReceipt {
  const item = objectAt(value, path);
  if (!Array.isArray(item.badges)) throw invalid(`${path}.badges`);
  const rewardId = stringAt(item.rewardId, `${path}.rewardId`);
  const child = partyAt(item.child, `${path}.child`);
  const robot = partyAt(item.robot, `${path}.robot`);
  const badges = item.badges.map((badge, index) => stringAt(badge, `${path}.badges[${index}]`));
  const awardedAt = stringAt(item.awardedAt, `${path}.awardedAt`);
  return {
    rewardId,
    child,
    robot,
    xp: integerAt(item.xp, `${path}.xp`),
    coins: integerAt(item.coins, `${path}.coins`),
    badges,
    reason: item.reason === null ? null : jsonAt(item.reason, `${path}.reason`),
    policyVersion: nullableStringAt(item.policyVersion, `${path}.policyVersion`),
    streak: streakAt(item.streak, `${path}.streak`),
    awardedAt,
  };
}

export async function getRewardHistory(filters: { childId?: string; deviceId?: string; limit?: number } = {}): Promise<RewardHistory> {
  const params: Record<string, string> = {};
  if (filters.childId) params.childId = filters.childId;
  if (filters.deviceId) params.deviceId = filters.deviceId;
  const response = await client.get('/mobile/rewards', { params });
  const data = objectAt(dataAt(response.data), 'data');
  const totals = objectAt(data.totals, 'data.totals');
  if (!Array.isArray(data.history) || typeof totals.refreshing !== 'boolean') throw invalid('data');
  return {
    totals: {
      xp: integerAt(totals.xp, 'data.totals.xp'),
      coins: integerAt(totals.coins, 'data.totals.coins'),
      rewardCount: integerAt(totals.rewardCount, 'data.totals.rewardCount'),
      refreshing: totals.refreshing,
    },
    history: data.history.map((item, index) => receiptAt(item, `data.history[${index}]`)),
  };
}

export async function getRewardInbox(): Promise<RewardInbox> {
  const response = await client.get('/mobile/rewards/inbox');
  const envelope = objectAt(response.data, 'response');
  if (!Array.isArray(envelope.data)) throw invalid('data');
  const meta = objectAt(envelope.meta, 'meta');
  return {
    rewards: envelope.data.map((item, index) => receiptAt(item, `data[${index}]`)),
    count: integerAt(meta.count, 'meta.count'),
  };
}

export async function acknowledgeRewardSeen(rewardId: string): Promise<SeenReward> {
  const requestId = `reward-seen-${rewardId}`;
  const response = await client.post(`/mobile/rewards/${rewardId}/seen`, undefined, {
    headers: { 'Idempotency-Key': requestId, 'X-Request-Id': requestId },
  });
  const data = objectAt(dataAt(response.data), 'data');
  if (data.seen !== true) throw invalid('data.seen');
  return { rewardId: stringAt(data.rewardId, 'data.rewardId'), seen: true, seenAt: stringAt(data.seenAt, 'data.seenAt') };
}
