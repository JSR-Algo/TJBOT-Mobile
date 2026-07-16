import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';
import { setAppLanguage } from '@/services/i18n/i18n';

const mockInbox = jest.fn();
const mockMutate = jest.fn();
let mockReduceMotion = true;
let mockQueuedSeen = false;
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: { id: 'house-1' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useRewardInboxQuery: () => mockInbox(),
  useAcknowledgeRewardMutation: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));
jest.mock('@/design-system/animations/useReduceMotion', () => ({ useReduceMotion: () => mockReduceMotion }));
jest.mock('@/features/rewards/offline/rewardSeenQueue', () => ({ isRewardSeenQueued: () => Promise.resolve(mockQueuedSeen) }));

const reward = { rewardId: 'reward-1', assignmentId: 'assignment-1', sessionId: 'session-1', child: { id: 'child-1', displayName: 'Mai' }, robot: { id: 'robot-1', displayName: 'Tee' }, xp: 30, coins: 5, badges: ['brave-speaker'], reason: 'lesson_completion', policyVersion: 'v1', streak: { currentDays: 3, bestDays: 5 }, awardedAt: '2026-07-13T01:00:00.000Z' };
const navigation = () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() });

describe('persisted reward surfaces', () => {
  beforeEach(() => { jest.clearAllMocks(); mockReduceMotion = true; mockQueuedSeen = false; mockInbox.mockReturnValue({ data: { rewards: [reward], count: 1 }, isLoading: false, isError: false, refetch: jest.fn() }); });
  afterEach(async () => { await act(async () => { await setAppLanguage('en'); }); });

  it('renders XP, coins, badge, streak, child, robot, and reason from the persisted inbox', async () => {
    render(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never} />);
    expect(await screen.findByText('XP: 30 · Coins: 5')).toBeTruthy();
    expect(screen.getByText('Mai · Tee')).toBeTruthy();
    expect(screen.getByText('Streak days: 3')).toBeTruthy();
    expect(screen.getByText('brave-speaker')).toBeTruthy();
    expect(screen.getByText('Lesson completed')).toBeTruthy();
  });

  it('does not celebrate again after restart while the seen acknowledgement is queued', async () => {
    mockQueuedSeen = true;
    render(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never} />);
    expect(await screen.findByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('XP: 30 · Coins: 5')).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('acknowledges once per mount and shows a reduced-motion static alternative', async () => {
    const view = render(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never} />);
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(view.UNSAFE_getByProps({ testID: 'celebration-static-stars' }).props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByTestId('celebration-confetti')).toBeNull();
  });

  it('shows waiting-to-sync and never predicts an award absent from the inbox', () => {
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<LessonSummaryScreen navigation={navigation() as never} route={{ key: 's', name: 'LessonSummaryScreen', params: { childId: 'child-1', deviceId: 'robot-1' } } as never} />);
    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText(/XP/)).toBeNull();
  });

  it('selects the exact assignment and session instead of an older unseen reward for the same child and robot', () => {
    const older = { ...reward, rewardId: 'reward-old', assignmentId: 'assignment-old', sessionId: 'session-old', xp: 99 };
    mockInbox.mockReturnValue({ data: { rewards: [older, reward], count: 2 }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<LessonSummaryScreen navigation={navigation() as never} route={{ key: 's', name: 'LessonSummaryScreen', params: { childId: 'child-1', deviceId: 'robot-1', assignmentId: 'assignment-1', sessionId: 'session-1' } } as never} />);
    expect(screen.getByText('30 XP · 5 coins')).toBeTruthy();
    expect(screen.queryByText('99 XP · 5 coins')).toBeNull();
  });

  it('offers retry when inbox refresh fails', () => {
    const refetch = jest.fn();
    mockInbox.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    render(<LessonSummaryScreen navigation={navigation() as never} route={{ key: 's', name: 'LessonSummaryScreen', params: { childId: 'child-1', deviceId: 'robot-1' } } as never} />);
    fireEvent.press(screen.getByLabelText('Retry reward'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { locale: 'en' as const, streak: null, expected: 'Streak unavailable', absent: 'Streak days: 0' },
    { locale: 'vi' as const, streak: null, expected: 'Chưa có dữ liệu chuỗi ngày', absent: 'Số ngày chuỗi: 0' },
    { locale: 'en' as const, streak: { currentDays: null, bestDays: 5 }, expected: 'Streak refreshing', absent: 'Streak days: 0' },
    { locale: 'vi' as const, streak: { currentDays: null, bestDays: 5 }, expected: 'Đang làm mới chuỗi ngày', absent: 'Số ngày chuỗi: 0' },
    { locale: 'en' as const, streak: { currentDays: 0, bestDays: 5 }, expected: 'Streak days: 0', absent: 'Streak refreshing' },
    { locale: 'vi' as const, streak: { currentDays: 0, bestDays: 5 }, expected: 'Số ngày chuỗi: 0', absent: 'Đang làm mới chuỗi ngày' },
  ])('preserves nullable streak truth in $locale for $expected', async ({ locale, streak, expected, absent }) => {
    await act(async () => { await setAppLanguage(locale); });
    mockInbox.mockReturnValue({ data: { rewards: [{ ...reward, streak }], count: 1 }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never} />);
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText(absent)).toBeNull();
    const summary = screen.getByLabelText(new RegExp(expected));
    if (locale === 'vi') expect(summary.props.accessibilityLabel).not.toMatch(/coins|day streak|Lesson completed|refreshing/i);
  });
});
