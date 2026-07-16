import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import LeaderboardScreen from '@/features/rewards/screens/LeaderboardView';
import { setAppLanguage } from '@/services/i18n/i18n';

const mockLeaderboard = jest.fn();
jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => ({ activeHousehold: { id: 'house-1' } }),
}));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useLeaderboardQuery: (scope: string, period: string, page: number, pageSize: number) =>
    mockLeaderboard(scope, period, page, pageSize),
}));

const owned = {
  rank: 41, rankStatus: 'refreshing', robotId: 'r1', childName: 'Mai', robotName: 'Tee',
  parentEmailMasked: 'ma***@example.com', xp: 90, completedLessonCount: 3,
  currentStreakDays: 2, badges: ['first-lesson'], optedIn: true, visibility: 'public',
};

function renderScreen(): void {
  render(<LeaderboardScreen navigation={{ goBack: jest.fn() } as never} route={{ key: 'l', name: 'LeaderboardScreen' } as never} />);
}

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboard.mockReturnValue({
      data: {
        period: 'weekly', rows: [{ ...owned, robotId: 'r2', childName: 'An', robotName: 'Nova', rank: 1, rankStatus: 'current' }], ownedRows: [owned],
        pagination: { page: 1, pageSize: 25, totalRows: 41, totalPages: 2 },
      },
      isLoading: false, isError: false, isFetching: false, refetch: jest.fn(),
    });
  });

  afterEach(async () => { await act(async () => { await setAppLanguage('en'); }); });

  it('renders backend-masked identity and a non-colour owned-row announcement', () => {
    renderScreen();
    expect(screen.getAllByText('ma***@example.com')).toHaveLength(2);
    expect(screen.getByLabelText('Your robot. Rank refreshing: 41. Mai with robot Tee. 90 XP. Lessons: 3. Streak days: 2. Badges: first-lesson. Parent ma***@example.com')).toBeTruthy();
    expect(screen.getAllByText('Lessons: 3')).toHaveLength(2);
    expect(screen.getAllByText('Streak days: 2')).toHaveLength(2);
    expect(screen.getAllByText('Badges: first-lesson')).toHaveLength(2);
  });

  it('switches period, refreshes, and requests only bounded pages', () => {
    const refetch = jest.fn();
    mockLeaderboard.mockReturnValue({ data: { period: 'weekly', rows: [], ownedRows: [], pagination: { page: 1, pageSize: 25, totalRows: 75, totalPages: 3 } }, isLoading: false, isError: false, isFetching: false, refetch });
    renderScreen();
    fireEvent.press(screen.getByLabelText('All time leaderboard'));
    expect(mockLeaderboard).toHaveBeenLastCalledWith('house-1', 'allTime', 1, 25);
    fireEvent.press(screen.getByLabelText('Refresh leaderboard'));
    expect(refetch).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Next leaderboard page'));
    expect(mockLeaderboard).toHaveBeenLastCalledWith('house-1', 'allTime', 2, 25);
  });

  it('keeps an opted-out owned robot private and outside public rows', () => {
    mockLeaderboard.mockReturnValue({ data: { period: 'weekly', rows: [], ownedRows: [{ ...owned, rank: null, rankStatus: 'private', optedIn: false, visibility: 'private', parentEmailMasked: '[hidden]', badges: [] }], pagination: { page: 1, pageSize: 25, totalRows: 0, totalPages: 0 } }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() });
    renderScreen();
    expect(screen.getByText('Private robot')).toBeTruthy();
    expect(screen.getByText('[hidden]')).toBeTruthy();
    expect(screen.getByText('No badges yet')).toBeTruthy();
  });

  it('localizes visible and accessibility leaderboard summaries without English leakage', async () => {
    await act(async () => { await setAppLanguage('vi'); });
    mockLeaderboard.mockReturnValue({ data: { period: 'weekly', rows: [], ownedRows: [{ ...owned, rank: null, rankStatus: 'refreshing', currentStreakDays: null, badges: [] }], pagination: { page: 1, pageSize: 25, totalRows: 0, totalPages: 0 } }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() });
    renderScreen();
    expect(screen.getByText('Bài học: 3')).toBeTruthy();
    expect(screen.getAllByText('Đang làm mới chuỗi ngày').length).toBeGreaterThan(0);
    expect(screen.getByText('Chưa có huy hiệu')).toBeTruthy();
    const summary = screen.getByLabelText(/Robot của bạn.*Bài học: 3.*Đang làm mới chuỗi ngày.*Chưa có huy hiệu/);
    expect(summary.props.accessibilityLabel).not.toMatch(/lessons|day streak|Badges|refreshing/i);
  });
});
