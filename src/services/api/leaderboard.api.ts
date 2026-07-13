import client from '@/services/http/client';
import type { AppError } from '@/utils/errors';

export type LeaderboardPeriod = 'weekly' | 'allTime';
export type LeaderboardRankStatus = 'current' | 'refreshing' | 'private';
export interface LeaderboardRow {
  rank: number | null;
  rankStatus: LeaderboardRankStatus;
  robotId: string;
  childName: string;
  robotName: string;
  parentEmailMasked: string;
  xp: number;
  completedLessonCount: number;
  currentStreakDays: number;
  badges: string[];
}
export interface OwnedLeaderboardRow extends LeaderboardRow { optedIn: boolean; visibility: 'public' | 'private' }
export interface LeaderboardPage {
  period: LeaderboardPeriod;
  rows: LeaderboardRow[];
  ownedRows: OwnedLeaderboardRow[];
  pagination: { page: number; pageSize: number; totalRows: number; totalPages: number };
}
export interface LeaderboardPreference { robotId: string; optedIn: boolean }

type RecordValue = Record<string, unknown>;
const publicKeys = new Set(['rank', 'rankStatus', 'robotId', 'childName', 'robotName', 'parentEmailMasked', 'xp', 'completedLessonCount', 'currentStreakDays', 'badges']);

function invalid(path: string): AppError {
  return { code: 'INVALID_API_RESPONSE', message: `Invalid leaderboard response at ${path}.`, retryable: false };
}
function objectAt(value: unknown, path: string): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalid(path);
  return value as RecordValue;
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw invalid(path);
  return value;
}
function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) throw invalid(path);
  return value as number;
}
function rowAt(value: unknown, path: string, owned: boolean): LeaderboardRow | OwnedLeaderboardRow {
  const item = objectAt(value, path);
  const allowed = owned ? new Set([...publicKeys, 'optedIn', 'visibility']) : publicKeys;
  if (Object.keys(item).some(key => !allowed.has(key))) throw invalid(path);
  const rankStatus = item.rankStatus;
  if (rankStatus !== 'current' && rankStatus !== 'refreshing' && rankStatus !== 'private') throw invalid(`${path}.rankStatus`);
  const email = text(item.parentEmailMasked, `${path}.parentEmailMasked`);
  const [local, domain, extra] = email.split('@');
  if (extra !== undefined || !local || !domain || (local.length > 1 && !local.endsWith('***'))) throw invalid(`${path}.parentEmailMasked`);
  if (!Array.isArray(item.badges)) throw invalid(`${path}.badges`);
  const base: LeaderboardRow = {
    rank: item.rank === null ? null : integer(item.rank, `${path}.rank`, 1),
    rankStatus,
    robotId: text(item.robotId, `${path}.robotId`),
    childName: text(item.childName, `${path}.childName`),
    robotName: text(item.robotName, `${path}.robotName`),
    parentEmailMasked: email,
    xp: integer(item.xp, `${path}.xp`),
    completedLessonCount: integer(item.completedLessonCount, `${path}.completedLessonCount`),
    currentStreakDays: integer(item.currentStreakDays, `${path}.currentStreakDays`),
    badges: item.badges.map((badge, index) => text(badge, `${path}.badges[${index}]`)),
  };
  if (!owned) return base;
  if (typeof item.optedIn !== 'boolean' || (item.visibility !== 'public' && item.visibility !== 'private')) throw invalid(path);
  return { ...base, optedIn: item.optedIn, visibility: item.visibility };
}

export async function getLeaderboard(params: { period: LeaderboardPeriod; page: number; pageSize: number }): Promise<LeaderboardPage> {
  const response = await client.get('/mobile/leaderboard', { params });
  const outer = objectAt(response.data, 'response');
  const data = objectAt(outer.data, 'data');
  if (data.period !== 'weekly' && data.period !== 'allTime') throw invalid('data.period');
  if (!Array.isArray(data.rows) || !Array.isArray(data.ownedRows)) throw invalid('data.rows');
  const pagination = objectAt(data.pagination, 'data.pagination');
  return {
    period: data.period,
    rows: data.rows.map((row, index) => rowAt(row, `data.rows[${index}]`, false) as LeaderboardRow),
    ownedRows: data.ownedRows.map((row, index) => rowAt(row, `data.ownedRows[${index}]`, true) as OwnedLeaderboardRow),
    pagination: {
      page: integer(pagination.page, 'data.pagination.page', 1),
      pageSize: integer(pagination.pageSize, 'data.pagination.pageSize', 1),
      totalRows: integer(pagination.totalRows, 'data.pagination.totalRows'),
      totalPages: integer(pagination.totalPages, 'data.pagination.totalPages'),
    },
  };
}

export async function updateLeaderboardPreference(deviceId: string, optedIn: boolean): Promise<LeaderboardPreference> {
  const response = await client.put(`/mobile/devices/${deviceId}/leaderboard-preference`, { optedIn });
  const data = objectAt(objectAt(response.data, 'response').data, 'data');
  if (typeof data.optedIn !== 'boolean') throw invalid('data.optedIn');
  return { robotId: text(data.robotId, 'data.robotId'), optedIn: data.optedIn };
}
