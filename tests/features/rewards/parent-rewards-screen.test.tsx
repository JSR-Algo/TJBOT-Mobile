import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ParentRewardsScreen from '@/features/rewards/screens/ParentRewardsView';
import { setAppLanguage } from '@/services/i18n/i18n';

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
  afterEach(async () => { await act(async () => { await setAppLanguage('en'); }); });

  it('shows private totals and groups persisted reasons by child and robot', () => {
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    expect(screen.getByText('120 XP')).toBeTruthy();
    expect(screen.getByText('Mai · Tee')).toBeTruthy();
    expect(screen.getByText('Lesson completed')).toBeTruthy();
    expect(screen.getByText('Streak days: 3')).toBeTruthy();
    expect(screen.getByLabelText('Lesson completed. XP: 30. Coins: 5. Streak days: 3.')).toBeTruthy();
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

  it('localizes Vietnamese reward history visible and accessibility summaries', async () => {
    await act(async () => { await setAppLanguage('vi'); });
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    expect(screen.getByText('Hoàn thành bài học')).toBeTruthy();
    expect(screen.getByText('XP: 30 · Xu: 5')).toBeTruthy();
    expect(screen.getByText('Số ngày chuỗi: 3')).toBeTruthy();
    const row = screen.getByLabelText('Hoàn thành bài học. XP: 30. Xu: 5. Số ngày chuỗi: 3.');
    expect(row.props.accessibilityLabel).not.toMatch(/Lesson completed|coins/i);
  });

  it.each([
    { streak: null, expected: 'Streak unavailable' },
    { streak: { currentDays: null, bestDays: 5 }, expected: 'Streak refreshing' },
    { streak: { currentDays: 0, bestDays: 5 }, expected: 'Streak days: 0' },
  ])('preserves parent-history streak truth for $expected', ({ streak, expected }) => {
    mockHistory.mockReturnValue({ data: { totals: { xp: 120, coins: 18, rewardCount: 4, refreshing: false }, history: [{ ...receipt, streak }] }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() });
    render(<ParentRewardsScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'p', name: 'ParentRewardsScreen' } as never} />);
    expect(screen.getByText(expected)).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(expected))).toBeTruthy();
  });
});
