import client from '@/services/http/client';
import { getRewardHistory, getRewardInbox, acknowledgeRewardSeen } from '@/services/api/rewards.api';
import { getLeaderboard, updateLeaderboardPreference } from '@/services/api/leaderboard.api';
import { updateChildDisplayName } from '@/services/api/households';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const mockedClient = client as jest.Mocked<typeof client>;

const reward = {
  rewardId: 'reward-1',
  assignmentId: 'assignment-1',
  sessionId: 'session-1',
  child: { id: 'child-1', displayName: null },
  robot: { id: 'robot-1', displayName: 'TeeBot Sun' },
  xp: 25,
  coins: 5,
  badges: ['first-lesson'],
  reason: {
    normalizedOutcomes: [{ outcome: 'lesson_completed' }],
    policy: { baseXp: 25 },
    streak: { currentDays: null, bestDays: 9 },
  },
  policyVersion: 'reward-policy.v1',
  streak: { currentDays: null, bestDays: 9 },
  awardedAt: '2026-07-12T09:30:00.000Z',
};

describe('authoritative rewards APIs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the exact private rewards query and preserves nullable policy/reason/streak data', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: {
      totals: { xp: 25, coins: 5, rewardCount: 1, refreshing: false }, history: [reward],
    } } });
    await expect(getRewardHistory({ childId: 'child-1', deviceId: 'robot-1' })).resolves.toEqual({
      totals: { xp: 25, coins: 5, rewardCount: 1, refreshing: false },
      history: [expect.objectContaining({ rewardId: 'reward-1', child: { id: 'child-1', displayName: null }, reason: reward.reason, streak: reward.streak })],
    });
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/rewards', { params: { childId: 'child-1', deviceId: 'robot-1' } });
  });

  it('reads the account inbox without client-selected child/device filters', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: [reward], meta: { count: 1 } } });
    await expect(getRewardInbox()).resolves.toMatchObject({ rewards: [{ rewardId: 'reward-1' }], count: 1 });
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/rewards/inbox');
  });

  it.each(['assignmentId', 'sessionId'])('rejects a reward receipt missing required %s', async (field) => {
    const malformed = { ...reward };
    delete malformed[field as 'assignmentId' | 'sessionId'];
    mockedClient.get.mockResolvedValueOnce({ data: { data: [malformed], meta: { count: 1 } } });
    await expect(getRewardInbox()).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' });
  });

  it('rejects malformed and privacy-leaking public payloads with AppError', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: {
      period: 'weekly', rows: [{ rank: 1, rankStatus: 'current', robotId: 'r1', childName: 'May', robotName: 'Tee', parentEmailMasked: 'parent@example.com', parentEmail: 'parent@example.com', xp: 1, completedLessonCount: 1, currentStreakDays: 1, badges: [] }],
      ownedRows: [], pagination: { page: 1, pageSize: 20, totalRows: 1, totalPages: 1 },
    } } });
    await expect(getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 })).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' });
  });

  it.each(['[hidden]', 'a@example.com', 'ma***@example.com'])('accepts backend-masked email %s', async (parentEmailMasked) => {
    const row = { rank: 1, rankStatus: 'current', robotId: 'r1', childName: 'May', robotName: 'Tee', parentEmailMasked, xp: 1, completedLessonCount: 1, currentStreakDays: 1, badges: [] };
    mockedClient.get.mockResolvedValueOnce({ data: { data: { period: 'weekly', rows: [row], ownedRows: [], pagination: { page: 1, pageSize: 20, totalRows: 1, totalPages: 1 } } } });
    await expect(getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 })).resolves.toMatchObject({ rows: [{ parentEmailMasked }] });
  });

  it('acknowledges seen with a stable request id and no reward mutation body', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { data: { rewardId: 'reward-1', seen: true, seenAt: '2026-07-12T09:35:00.000Z' } } });
    await acknowledgeRewardSeen('reward-1');
    expect(mockedClient.post).toHaveBeenCalledWith('/mobile/rewards/reward-1/seen', undefined, {
      headers: { 'Idempotency-Key': 'reward-seen-reward-1', 'X-Request-Id': 'reward-seen-reward-1' },
    });
  });

  it('uses page pagination and retains distinct public and owned leaderboard rows', async () => {
    const row = { rank: null, rankStatus: 'refreshing', robotId: 'robot-1', childName: 'May', robotName: 'Tee', parentEmailMasked: 'ma***@example.com', xp: 25, completedLessonCount: 1, currentStreakDays: 2, badges: [] };
    mockedClient.get.mockResolvedValueOnce({ data: { data: {
      period: 'allTime', rows: [row], ownedRows: [{ ...row, rankStatus: 'private', optedIn: false, visibility: 'private' }],
      pagination: { page: 2, pageSize: 10, totalRows: 12, totalPages: 2 },
    } } });
    await expect(getLeaderboard({ period: 'allTime', page: 2, pageSize: 10 })).resolves.toMatchObject({
      period: 'allTime', rows: [{ rank: null }], ownedRows: [{ optedIn: false, visibility: 'private' }], pagination: { page: 2 },
    });
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/leaderboard', { params: { period: 'allTime', page: 2, pageSize: 10 } });
  });

  it('updates only exact preference and child display-name contracts', async () => {
    mockedClient.put.mockResolvedValueOnce({ data: { data: { robotId: 'robot-1', optedIn: true } } });
    mockedClient.patch.mockResolvedValueOnce({ data: { data: { id: 'child-1', displayName: 'May' } } });
    await expect(updateLeaderboardPreference('robot-1', true)).resolves.toEqual({ robotId: 'robot-1', optedIn: true });
    await expect(updateChildDisplayName('child-1', 'May')).resolves.toEqual({ id: 'child-1', displayName: 'May' });
    expect(mockedClient.put).toHaveBeenCalledWith('/mobile/devices/robot-1/leaderboard-preference', { optedIn: true });
    expect(mockedClient.patch).toHaveBeenCalledWith('/mobile/children/child-1', { displayName: 'May' });
  });
});
