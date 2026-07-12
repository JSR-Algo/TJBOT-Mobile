import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ParentRewardsScreen from '@/features/rewards/screens/ParentRewardsView';

const mockTotals = jest.fn();
const mockHistory = jest.fn();
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeChild: { id: 'child-1', name: 'Mai' } }) }));
jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({ useParentGateGuard: () => undefined }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useRewardTotalsQuery: () => mockTotals(),
  useRewardHistoryQuery: () => mockHistory(),
}));

describe('ParentRewardsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTotals.mockReturnValue({ data: { childId: 'child-1', totalXp: 120, totalCoins: 18, lessonCompletions: 4, currentStreakDays: 3 }, isLoading: false, isError: false, refetch: jest.fn() });
    mockHistory.mockReturnValue({
      data: { pages: [{ items: [{ id: 'reward-1', assignmentId: 'a1', lessonId: 'l1', childId: 'child-1', deviceId: 'r1', sessionId: null, xp: 30, coins: 5, badgeKey: 'brave', badgeName: 'Brave Speaker', grantedAt: '2026-07-13T01:00:00.000Z', seenAt: null }], nextCursor: 'next' }] },
      isLoading: false, isError: false, hasNextPage: true, isFetchingNextPage: false, fetchNextPage: jest.fn(), refetch: jest.fn(),
    });
  });

  it('shows private child totals and persisted reward history', () => {
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    expect(screen.getByText("Mai's rewards")).toBeTruthy();
    expect(screen.getByText('120 XP')).toBeTruthy();
    expect(screen.getByText('Brave Speaker')).toBeTruthy();
    expect(screen.getByText('30 XP · 5 coins')).toBeTruthy();
  });

  it('paginates private history', () => {
    const fetchNextPage = jest.fn();
    mockHistory.mockReturnValue({ data: { pages: [{ items: [], nextCursor: 'next' }] }, isLoading: false, isError: false, hasNextPage: true, isFetchingNextPage: false, fetchNextPage, refetch: jest.fn() });
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    fireEvent.press(screen.getByText('Load more'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
