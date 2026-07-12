import client from '@/services/http/client';
import {
  acknowledgeRewardSeen,
  getLeaderboard,
  getLeaderboardPreference,
  getRewardHistory,
  getRewardInbox,
  getRewardTotals,
  getRewardForCompletion,
  updateLeaderboardPreference,
} from '@/services/api/rewards.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('rewards api', () => {
  beforeEach(() => jest.clearAllMocks());

  it('normalizes reward totals from the authenticated child endpoint', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: { data: { child_id: 'child-1', total_xp: 120, total_coins: 18, lesson_completions: 4, current_streak_days: 3 } },
    });

    await expect(getRewardTotals('child-1')).resolves.toEqual({
      childId: 'child-1', totalXp: 120, totalCoins: 18, lessonCompletions: 4, currentStreakDays: 3,
      badgeCount: 0, longestStreakDays: 0,
    });
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/children/child-1/rewards/totals');
  });

  it('loads an assignment-bound inbox without fabricating an award', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: { rewards: [] } } });

    await expect(getRewardInbox({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assign-1' }))
      .resolves.toEqual([]);
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/children/child-1/rewards/inbox', {
      params: { deviceId: 'robot-1', assignmentId: 'assign-1' },
    });
  });

  it('preserves a held completion so the UI stops waiting for an award that cannot be granted', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: { rewards: [{
      id: 'held-1', assignment_id: 'assign-1', lesson_id: 'lesson-1', child_id: 'child-1',
      device_id: 'robot-1', status: 'held', configuration_error_code: 'robot_child_assignment_inactive',
      granted_at: '2026-07-13T01:00:00.000Z',
    }] } } });

    await expect(getRewardForCompletion({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assign-1' }))
      .resolves.toMatchObject({ status: 'held', configurationErrorCode: 'robot_child_assignment_inactive' });
  });

  it('normalizes cursor reward history and immutable award identity', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: { data: { items: [{
        id: 'reward-1', assignment_id: 'assign-1', session_id: 'session-1', lesson_id: 'lesson-1',
        child_id: 'child-1', device_id: 'robot-1', xp: 30, coins: 5,
        badge_key: 'brave-speaker', badge_name: 'Brave Speaker', granted_at: '2026-07-13T01:00:00.000Z', seen_at: null,
      }], next_cursor: 'cursor-2' } },
    });

    await expect(getRewardHistory({ childId: 'child-1', limit: 20 })).resolves.toEqual({
      items: [{
        id: 'reward-1', assignmentId: 'assign-1', sessionId: 'session-1', lessonId: 'lesson-1',
        childId: 'child-1', deviceId: 'robot-1', lessonVersion: 0, milestoneKey: null, xp: 30, coins: 5,
        badgeKey: 'brave-speaker', badgeName: 'Brave Speaker', grantedAt: '2026-07-13T01:00:00.000Z', seenAt: null,
        status: 'awarded', configurationErrorCode: null,
      }], nextCursor: 'cursor-2',
    });
  });

  it('acknowledges seen with a stable request id and idempotency key', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { data: { reward_id: 'reward-1', seen_at: '2026-07-13T01:02:00.000Z' } } });

    await acknowledgeRewardSeen('reward-1');

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/mobile/rewards/reward-1/seen',
      { request_id: 'reward-seen-reward-1' },
      { headers: { 'Idempotency-Key': 'reward-seen-reward-1', 'X-Request-Id': 'reward-seen-reward-1' } },
    );
  });

  it('returns leaderboard rows with only the backend-masked email', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: {
      items: [{ rank: 1, device_id: 'robot-1', child_name: 'Mai', robot_name: 'Tee', masked_parent_email: 'ma***@example.com', xp: 90, completions: 3, owned: true }],
      owned_row: null, next_cursor: null,
    } } });

    const page = await getLeaderboard({ period: 'weekly', deviceId: 'robot-1', limit: 25 });

    expect(page.items[0]).toEqual({ rank: 1, deviceId: 'robot-1', childName: 'Mai', robotName: 'Tee', maskedParentEmail: 'ma***@example.com', xp: 90, completions: 3, owned: true });
    expect(page.items[0]).not.toHaveProperty('parentEmail');
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/leaderboard', { params: { period: 'weekly', deviceId: 'robot-1', limit: 25 } });
  });

  it('reads and updates a per-robot leaderboard preference', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: { device_id: 'robot-1', opted_in: false } } });
    mockedClient.put.mockResolvedValueOnce({ data: { data: { device_id: 'robot-1', opted_in: true } } });

    await expect(getLeaderboardPreference('robot-1')).resolves.toEqual({ deviceId: 'robot-1', optedIn: false });
    await expect(updateLeaderboardPreference('robot-1', true)).resolves.toEqual({ deviceId: 'robot-1', optedIn: true });
    expect(mockedClient.put).toHaveBeenCalledWith('/mobile/robots/robot-1/leaderboard-preference', { opted_in: true });
  });

  it('preserves the complete backend reward and totals DTO', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: {
      childId: 'child-1', totalXp: 30, totalCoins: 5, lessonCompletions: 1,
      badgeCount: 2, currentStreakDays: 3, longestStreakDays: 7,
    } } });
    await expect(getRewardTotals('child-1')).resolves.toMatchObject({ badgeCount: 2, longestStreakDays: 7 });

    mockedClient.get.mockResolvedValueOnce({ data: { data: { rewards: [{
      id: 'reward-1', assignmentId: 'assign-1', lessonId: 'lesson-1', childId: 'child-1',
      deviceId: 'robot-1', lessonVersion: 4, milestoneKey: 'first-week', xp: 30, coins: 5,
      grantedAt: '2026-07-13T00:00:00.000Z',
    }] } } });
    await expect(getRewardForCompletion({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assign-1' }))
      .resolves.toMatchObject({ lessonVersion: 4, milestoneKey: 'first-week' });
  });

  it('falls back to paginated history for an already-seen exact completion tuple', async () => {
    mockedClient.get
      .mockResolvedValueOnce({ data: { data: { rewards: [] } } })
      .mockResolvedValueOnce({ data: { data: { items: [{
        id: 'other', assignmentId: 'other', childId: 'child-1', deviceId: 'robot-1', xp: 1, coins: 1,
        grantedAt: '2026-07-13T00:00:00.000Z',
      }], next_cursor: 'next' } } })
      .mockResolvedValueOnce({ data: { data: { items: [{
        id: 'reward-1', assignmentId: 'assign-1', childId: 'child-1', deviceId: 'robot-1', xp: 30, coins: 5,
        grantedAt: '2026-07-12T00:00:00.000Z', seenAt: '2026-07-13T00:00:00.000Z',
      }], next_cursor: null } } });

    await expect(getRewardForCompletion({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assign-1' }))
      .resolves.toMatchObject({ id: 'reward-1', seenAt: '2026-07-13T00:00:00.000Z' });
  });

  it('bounds history fallback when a pending completion is not found', async () => {
    mockedClient.get
      .mockResolvedValueOnce({ data: { data: { rewards: [] } } })
      .mockResolvedValue({ data: { data: { items: [], next_cursor: 'more' } } });

    await expect(getRewardForCompletion({ childId: 'child-1', deviceId: 'robot-1', assignmentId: 'missing' }))
      .resolves.toBeNull();
    expect(mockedClient.get).toHaveBeenCalledTimes(4);
  });
});
