import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';
import { setAppLanguage } from '@/services/i18n/i18n';

const mockInbox = jest.fn();
const mockMutate = jest.fn();
const mockIsRewardSeenQueued = jest.fn();
let mockReduceMotion = true;
let mockQueuedSeen = false;
let mockAccountId: string | undefined = 'account-1';
let mockHouseholdId: string | undefined = 'house-1';
jest.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => ({ user: mockAccountId ? { id: mockAccountId } : null }) }));
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: mockHouseholdId ? { id: mockHouseholdId } : undefined }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useRewardInboxQuery: () => mockInbox(),
  useAcknowledgeRewardMutation: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));
jest.mock('@/design-system/animations/useReduceMotion', () => ({ useReduceMotion: () => mockReduceMotion }));
jest.mock('@/features/rewards/offline/rewardSeenQueue', () => ({ isRewardSeenQueued: (rewardId: string, scope?: unknown) => mockIsRewardSeenQueued(rewardId, scope) }));

const reward = { rewardId: 'reward-1', assignmentId: 'assignment-1', sessionId: 'session-1', child: { id: 'child-1', displayName: 'Mai' }, robot: { id: 'robot-1', displayName: 'Tee' }, xp: 30, coins: 5, badges: ['brave-speaker'], reason: 'lesson_completion', policyVersion: 'v1', streak: { currentDays: 3, bestDays: 5 }, awardedAt: '2026-07-13T01:00:00.000Z' };
const navigation = () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() });

describe('persisted reward surfaces', () => {
  beforeEach(() => { jest.clearAllMocks(); mockAccountId = 'account-1'; mockHouseholdId = 'house-1'; mockReduceMotion = true; mockQueuedSeen = false; mockIsRewardSeenQueued.mockImplementation(() => Promise.resolve(mockQueuedSeen)); mockInbox.mockReturnValue({ data: { rewards: [reward], count: 1 }, isLoading: false, isError: false, refetch: jest.fn() }); });
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

  it('keeps the persisted reward visible after acknowledgement removes it from the inbox', async () => {
    const props = { navigation: navigation() as never, route: { key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never };
    const view = render(<CelebrationScreen {...props} />);
    expect(await screen.findByText('XP: 30 · Coins: 5')).toBeTruthy();
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen {...props} />);

    expect(screen.getByText('XP: 30 · Coins: 5')).toBeTruthy();
    expect(screen.queryByText('Reward is waiting to sync')).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('does not reuse the latched reward when the mounted route requests a different reward', async () => {
    const view = render(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never} />);
    expect(await screen.findByText('XP: 30 · Coins: 5')).toBeTruthy();
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    mockQueuedSeen = true;
    mockInbox.mockReturnValue({ data: { rewards: [{ ...reward, rewardId: 'reward-2', xp: 40 }], count: 1 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-2' } } as never} />);

    expect(await screen.findByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('XP: 30 · Coins: 5')).toBeNull();
    expect(screen.queryByText('XP: 40 · Coins: 5')).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('acknowledges each reward only once when one mounted route moves from A to B and back to A', async () => {
    const route = (rewardId: string) => ({ key: 'c', name: 'CelebrationScreen', params: { rewardId } } as never);
    const view = render(<CelebrationScreen navigation={navigation() as never} route={route('reward-1')} />);
    expect(await screen.findByText('XP: 30 · Coins: 5')).toBeTruthy();
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    mockInbox.mockReturnValue({ data: { rewards: [{ ...reward, rewardId: 'reward-2', xp: 40 }], count: 1 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen navigation={navigation() as never} route={route('reward-2')} />);
    expect(await screen.findByText('XP: 40 · Coins: 5')).toBeTruthy();
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(2));

    mockInbox.mockReturnValue({ data: { rewards: [reward], count: 1 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen navigation={navigation() as never} route={route('reward-1')} />);
    expect(await screen.findByText('XP: 30 · Coins: 5')).toBeTruthy();
    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenNthCalledWith(1, 'reward-1');
    expect(mockMutate).toHaveBeenNthCalledWith(2, 'reward-2');
  });

  it('clears a latched reward with the same ID when the household changes or logs out', async () => {
    const props = { navigation: navigation() as never, route: { key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never };
    const view = render(<CelebrationScreen {...props} />);
    expect(await screen.findByText('Mai · Tee')).toBeTruthy();

    mockHouseholdId = 'house-2';
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen {...props} />);
    expect(await screen.findByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('Mai · Tee')).toBeNull();

    mockHouseholdId = undefined;
    view.rerender(<CelebrationScreen {...props} />);
    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('Mai · Tee')).toBeNull();
  });

  it('treats the same household and reward IDs as a new scope after an account switch', async () => {
    const props = { navigation: navigation() as never, route: { key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never };
    const view = render(<CelebrationScreen {...props} />);
    expect(await screen.findByText('Mai · Tee')).toBeTruthy();
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    mockAccountId = 'account-2';
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen {...props} />);

    expect(await screen.findByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('Mai · Tee')).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('ignores a queued-seen lookup that resolves after switching households', async () => {
    let resolveOldLookup: (queued: boolean) => void = () => undefined;
    const oldLookup = new Promise<boolean>(resolve => { resolveOldLookup = resolve; });
    mockIsRewardSeenQueued.mockImplementationOnce(() => oldLookup).mockResolvedValueOnce(false);
    const props = { navigation: navigation() as never, route: { key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never };
    const view = render(<CelebrationScreen {...props} />);
    expect(await screen.findByText('Reward is waiting to sync')).toBeTruthy();

    mockHouseholdId = 'house-2';
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() });
    view.rerender(<CelebrationScreen {...props} />);
    await act(async () => { resolveOldLookup(false); await oldLookup; });

    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('Mai · Tee')).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockIsRewardSeenQueued).toHaveBeenCalledTimes(2);
    expect(mockIsRewardSeenQueued).toHaveBeenNthCalledWith(2, 'reward-1', { accountId: 'account-1', householdScope: 'house-2' });
  });

  it('shows waiting-to-sync when the requested celebration reward is absent from the inbox', async () => {
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<CelebrationScreen navigation={navigation() as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'missing-reward' } } as never} />);
    expect(await screen.findByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText(/XP:/)).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
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
