import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import LeaderboardScreen from '@/features/rewards/screens/LeaderboardView';

const mockLeaderboard = jest.fn();
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useActiveChildRobotQuery: () => ({ data: { id: 'r1', name: 'Tee' } }),
  useLeaderboardQuery: (period: string, deviceId?: string) => mockLeaderboard(period, deviceId),
}));
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeChild: { id: 'child-1', name: 'Mai' } }) }));

function renderScreen(): void {
  render(<LeaderboardScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{ key: 'l', name: 'LeaderboardScreen' } as never} />);
}

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboard.mockReturnValue({
      data: { pages: [{
        items: [{ rank: 1, deviceId: 'r1', childName: 'Mai', robotName: 'Tee', maskedParentEmail: 'ma***@example.com', xp: 90, completions: 3, owned: true }],
        ownedRow: null, nextCursor: 'next',
      }] },
      isLoading: false, isError: false, hasNextPage: true, isFetchingNextPage: false,
      fetchNextPage: jest.fn(), refetch: jest.fn(),
    });
  });

  it('shows child, robot and only the backend-masked parent email', () => {
    renderScreen();
    expect(screen.getByText('Mai · Tee')).toBeTruthy();
    expect(screen.getByText('ma***@example.com')).toBeTruthy();
    expect(screen.getByLabelText('Your rank 1. Mai with robot Tee. 90 XP. Parent ma***@example.com')).toBeTruthy();
  });

  it('switches between weekly and all-time query periods', () => {
    renderScreen();
    fireEvent.press(screen.getByText('All time'));
    expect(mockLeaderboard).toHaveBeenLastCalledWith('allTime', 'r1');
  });

  it('loads the next cursor page', () => {
    const fetchNextPage = jest.fn();
    mockLeaderboard.mockReturnValue({
      data: { pages: [{ items: [], ownedRow: null, nextCursor: 'next' }] },
      isLoading: false, isError: false, hasNextPage: true, isFetchingNextPage: false,
      fetchNextPage, refetch: jest.fn(),
    });
    renderScreen();
    fireEvent.press(screen.getByText('Load more'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
