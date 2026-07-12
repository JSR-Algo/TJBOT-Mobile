import client from '@/services/http/client';
import { toNonNegativeNumber } from '@/utils/number';

export type LeaderboardPeriod = 'weekly' | 'allTime';

export interface LessonReward {
  id: string;
  assignmentId: string;
  sessionId: string | null;
  lessonId: string;
  childId: string;
  deviceId: string;
  lessonVersion: number;
  milestoneKey: string | null;
  xp: number;
  coins: number;
  badgeKey: string | null;
  badgeName: string | null;
  grantedAt: string;
  seenAt: string | null;
  status: 'awarded' | 'held';
  configurationErrorCode: string | null;
}

export interface RewardTotals {
  childId: string;
  totalXp: number;
  totalCoins: number;
  lessonCompletions: number;
  currentStreakDays: number;
  badgeCount: number;
  longestStreakDays: number;
}

export interface RewardHistoryPage {
  items: LessonReward[];
  nextCursor: string | null;
}

export interface LeaderboardRow {
  rank: number;
  deviceId: string;
  childName: string;
  robotName: string;
  maskedParentEmail: string;
  xp: number;
  completions: number;
  owned: boolean;
}

export interface LeaderboardPage {
  items: LeaderboardRow[];
  ownedRow: LeaderboardRow | null;
  nextCursor: string | null;
}

export interface RobotLeaderboardPreference {
  deviceId: string;
  optedIn: boolean;
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

function envelope(value: unknown): JsonRecord {
  const outer = record(value);
  return 'data' in outer ? record(outer.data) : outer;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function normalizeReward(value: unknown): LessonReward {
  const item = record(value);
  const status = item.status === 'held' ? 'held' : 'awarded';
  return {
    id: textValue(item.id),
    assignmentId: textValue(item.assignment_id ?? item.assignmentId),
    sessionId: nullableText(item.session_id ?? item.sessionId),
    lessonId: textValue(item.lesson_id ?? item.lessonId),
    childId: textValue(item.child_id ?? item.childId),
    deviceId: textValue(item.device_id ?? item.deviceId),
    lessonVersion: toNonNegativeNumber(item.lesson_version ?? item.lessonVersion),
    milestoneKey: nullableText(item.milestone_key ?? item.milestoneKey),
    xp: toNonNegativeNumber(item.xp),
    coins: toNonNegativeNumber(item.coins),
    badgeKey: nullableText(item.badge_key ?? item.badgeKey),
    badgeName: nullableText(item.badge_name ?? item.badgeName),
    grantedAt: textValue(item.granted_at ?? item.grantedAt ?? item.completed_at ?? item.completedAt),
    seenAt: nullableText(item.seen_at ?? item.seenAt),
    status,
    configurationErrorCode: nullableText(item.configuration_error_code ?? item.configurationErrorCode),
  };
}

function normalizeLeaderboardRow(value: unknown): LeaderboardRow {
  const item = record(value);
  return {
    rank: toNonNegativeNumber(item.rank),
    deviceId: textValue(item.device_id ?? item.deviceId),
    childName: textValue(item.child_name ?? item.childName),
    robotName: textValue(item.robot_name ?? item.robotName),
    maskedParentEmail: textValue(item.masked_parent_email ?? item.maskedParentEmail),
    xp: toNonNegativeNumber(item.xp),
    completions: toNonNegativeNumber(item.completions),
    owned: booleanValue(item.owned),
  };
}

export async function getRewardTotals(childId: string): Promise<RewardTotals> {
  const response = await client.get(`/mobile/children/${childId}/rewards/totals`);
  const data = envelope(response.data);
  return {
    childId: textValue(data.child_id ?? data.childId),
    totalXp: toNonNegativeNumber(data.total_xp ?? data.totalXp),
    totalCoins: toNonNegativeNumber(data.total_coins ?? data.totalCoins),
    lessonCompletions: toNonNegativeNumber(data.lesson_completions ?? data.lessonCompletions),
    currentStreakDays: toNonNegativeNumber(data.current_streak_days ?? data.currentStreakDays),
    badgeCount: toNonNegativeNumber(data.badge_count ?? data.badgeCount),
    longestStreakDays: toNonNegativeNumber(data.longest_streak_days ?? data.longestStreakDays),
  };
}

export async function getRewardInbox(params: {
  childId: string;
  deviceId: string;
  assignmentId: string;
}): Promise<LessonReward[]> {
  const response = await client.get(`/mobile/children/${params.childId}/rewards/inbox`, {
    params: { deviceId: params.deviceId, assignmentId: params.assignmentId },
  });
  const data = envelope(response.data);
  return Array.isArray(data.rewards) ? data.rewards.map(normalizeReward) : [];
}

export async function getRewardHistory(params: {
  childId: string;
  cursor?: string;
  limit?: number;
}): Promise<RewardHistoryPage> {
  const query: Record<string, string | number> = {};
  if (params.cursor) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;
  const response = await client.get(`/mobile/children/${params.childId}/rewards/history`, { params: query });
  const data = envelope(response.data);
  return {
    items: Array.isArray(data.items) ? data.items.map(normalizeReward) : [],
    nextCursor: nullableText(data.next_cursor ?? data.nextCursor),
  };
}

export async function getRewardForCompletion(params: {
  childId: string;
  deviceId: string;
  assignmentId: string;
}): Promise<LessonReward | null> {
  const exactMatch = (reward: LessonReward): boolean =>
    reward.childId === params.childId
    && reward.deviceId === params.deviceId
    && reward.assignmentId === params.assignmentId;
  const inbox = await getRewardInbox(params);
  const unseen = inbox.find(exactMatch);
  if (unseen) return unseen;

  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 3; pageNumber += 1) {
    const page = await getRewardHistory({ childId: params.childId, cursor, limit: 100 });
    const seen = page.items.find(exactMatch);
    if (seen) return seen;
    cursor = page.nextCursor ?? undefined;
    if (!cursor) break;
  }
  return null;
}

export async function acknowledgeRewardSeen(rewardId: string): Promise<void> {
  const requestId = `reward-seen-${rewardId}`;
  await client.post(
    `/mobile/rewards/${rewardId}/seen`,
    { request_id: requestId },
    { headers: { 'Idempotency-Key': requestId, 'X-Request-Id': requestId } },
  );
}

export async function getLeaderboard(params: {
  period: LeaderboardPeriod;
  deviceId?: string;
  cursor?: string;
  limit?: number;
}): Promise<LeaderboardPage> {
  const query: Record<string, string | number> = { period: params.period };
  if (params.deviceId) query.deviceId = params.deviceId;
  if (params.cursor) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;
  const response = await client.get('/mobile/leaderboard', { params: query });
  const data = envelope(response.data);
  return {
    items: Array.isArray(data.items) ? data.items.map(normalizeLeaderboardRow) : [],
    ownedRow: data.owned_row || data.ownedRow ? normalizeLeaderboardRow(data.owned_row ?? data.ownedRow) : null,
    nextCursor: nullableText(data.next_cursor ?? data.nextCursor),
  };
}

export async function getLeaderboardPreference(deviceId: string): Promise<RobotLeaderboardPreference> {
  const response = await client.get(`/mobile/robots/${deviceId}/leaderboard-preference`);
  const data = envelope(response.data);
  return { deviceId: textValue(data.device_id ?? data.deviceId), optedIn: booleanValue(data.opted_in ?? data.optedIn) };
}

export async function updateLeaderboardPreference(
  deviceId: string,
  optedIn: boolean,
): Promise<RobotLeaderboardPreference> {
  const response = await client.put(`/mobile/robots/${deviceId}/leaderboard-preference`, { opted_in: optedIn });
  const data = envelope(response.data);
  return { deviceId: textValue(data.device_id ?? data.deviceId), optedIn: booleanValue(data.opted_in ?? data.optedIn) };
}
