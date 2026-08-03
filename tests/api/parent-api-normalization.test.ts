import client from '@/services/http/client';
import {
  authenticateParent,
  clearParentLockout,
  getParentHistory,
  getParentSummary,
} from '@/services/api/parent.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('parent API response normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps parent auth responses from API envelopes', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: { data: { authenticated: true, authenticated_at: '2026-05-18T00:00:00.000Z' } },
    });

    await expect(authenticateParent({ pin: '1234' })).resolves.toEqual({
      authenticated: true,
      authenticated_at: '2026-05-18T00:00:00.000Z',
    });

    expect(mockedClient.post).toHaveBeenCalledWith('/parent/auth', { pin: '1234' });
  });

  it('normalizes clear-lockout request keys and direct backend responses', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { cleared: true } });

    await expect(clearParentLockout({ targetUserId: 'parent-1', reason: 'manual review' })).resolves.toEqual({
      cleared: true,
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/parent/lockout/clear',
      { target_user_id: 'parent-1', reason: 'manual review' },
    );
  });

  it('composes the weekly parent summary from real today and history routes', async () => {
    mockedClient.get
      .mockResolvedValueOnce({
        data: {
          date: '2026-07-22',
          total_minutes: 12,
          lessons_completed: 2,
          current_streak: 4,
          highlights: [
            { type: 'lesson', title: 'Barnyard Animals', value: '2 completed' },
            { type: 'word', title: 'New word', value: 'horse' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          daily: [{ date: '2026-07-22', minutes: 12, lessons_completed: 2 }],
          totals: { minutes: 46, lessons_completed: 6, active_days: 4 },
        },
      });

    await expect(getParentSummary()).resolves.toEqual({
      weekMinutes: 46,
      weekLessons: 6,
      streak: 4,
      topWords: ['horse'],
    });
    expect(mockedClient.get).toHaveBeenNthCalledWith(1, '/parent/today');
    expect(mockedClient.get).toHaveBeenNthCalledWith(2, '/parent/history');
  });

  it('normalizes the backend history envelope into mobile daily entries', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        child_id: 'child-1',
        daily: [{ date: '2026-07-22', minutes: 12, lessons_completed: 2 }],
        totals: { minutes: 12, lessons_completed: 2, active_days: 1 },
      },
    });

    await expect(getParentHistory()).resolves.toEqual([
      { date: '2026-07-22', minutes: 12, lessons: 2 },
    ]);
  });
});
