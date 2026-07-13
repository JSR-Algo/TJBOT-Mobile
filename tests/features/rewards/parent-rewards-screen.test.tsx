import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ParentRewardsScreen from '@/features/rewards/screens/ParentRewardsView';

const mockHistory = jest.fn();
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: { id: 'house-1' }, activeChild: { id: 'child-1', name: 'Mai' }, children: [{ id: 'child-1', name: 'Mai' }, { id: 'child-2', name: 'An' }] }) }));
jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({ useParentGateGuard: () => undefined }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({ useRewardHistoryQuery: (...args: string[]) => mockHistory(...args) }));

const receipt = { rewardId: 'rw-1', child: { id: 'child-1', displayName: 'Mai' }, robot: { id: 'r1', displayName: 'Tee' }, xp: 30, coins: 5, badges: ['brave'], reason: { label: 'lesson_completion' }, policyVersion: 'v1', streak: { currentDays: 3, bestDays: 5 }, awardedAt: '2026-07-13T01:00:00.000Z' };

describe('ParentRewardsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.mockReturnValue({ data: { totals: { xp: 120, coins: 18, rewardCount: 4, refreshing: false }, history: [receipt] }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() });
  });

  it('shows private totals and groups persisted reasons by child and robot', () => {
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    expect(screen.getByText('120 XP')).toBeTruthy();
    expect(screen.getByText('Mai · Tee')).toBeTruthy();
    expect(screen.getByText('Lesson completed')).toBeTruthy();
  });

  it('filters history by child and robot without fabricating values', () => {
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    fireEvent.press(screen.getByLabelText('Filter rewards for An'));
    expect(mockHistory).toHaveBeenLastCalledWith('house-1', 'child-2', undefined);
    fireEvent.press(screen.getByLabelText('Filter rewards for robot Tee'));
    expect(mockHistory).toHaveBeenLastCalledWith('house-1', 'child-2', 'r1');
  });

  it('labels cached data stale while offline and retains retry', () => {
    mockHistory.mockReturnValue({ data: { totals: { xp: 120, coins: 18, rewardCount: 4, refreshing: false }, history: [receipt] }, isLoading: false, isError: true, isFetching: false, fetchStatus: 'paused', refetch: jest.fn() });
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    expect(screen.getByText('Offline · showing saved rewards')).toBeTruthy();
    expect(screen.getByLabelText('Retry reward history')).toBeTruthy();
  });
});
