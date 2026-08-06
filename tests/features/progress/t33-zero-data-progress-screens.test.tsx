// T3.3 deep-dive — zero-data edges and celebration idempotency.
//
// Boxes covered here:
//   * Zero-data child: dashboard / celebration / summary render honest empty states
//   * Celebration screen is not replayed on re-entry (idempotent celebration flag)

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';
import WordsPracticedScreen from '@/features/progress/screens/WordsPracticedScreen';
import { useChildProgressDashboardQuery } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import { useAcknowledgeRewardMutation, useRewardInboxQuery } from '@/features/rewards/hooks/useRewards';
import { isRewardSeenQueued } from '@/features/rewards/offline/rewardSeenQueue';
import type { RewardReceipt } from '@/services/api/rewards.api';

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: jest.fn(() => ({ activeChild: { id: 'child-1', name: 'Mai' }, activeHousehold: { id: 'house-1' } })),
}));
jest.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: jest.fn(() => ({ user: { id: 'account-1' } })) }));
jest.mock('@/features/progress/hooks/useChildProgressDashboardQuery', () => ({ useChildProgressDashboardQuery: jest.fn() }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useRewardInboxQuery: jest.fn(),
  useAcknowledgeRewardMutation: jest.fn(),
}));
jest.mock('@/features/rewards/offline/rewardSeenQueue', () => ({ isRewardSeenQueued: jest.fn() }));

const mockDashboard = useChildProgressDashboardQuery as jest.MockedFunction<typeof useChildProgressDashboardQuery>;
const mockInbox = useRewardInboxQuery as jest.MockedFunction<typeof useRewardInboxQuery>;
const mockAcknowledge = useAcknowledgeRewardMutation as jest.MockedFunction<typeof useAcknowledgeRewardMutation>;
const mockSeenQueued = isRewardSeenQueued as jest.MockedFunction<typeof isRewardSeenQueued>;

const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };

function wrap(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

const reward: RewardReceipt = {
  rewardId: 'reward-1', assignmentId: 'assign-1', sessionId: 'session-1', xp: 30, coins: 5, badges: [],
  reason: 'lesson_completion', streak: { currentDays: 3 },
  child: { id: 'child-1', displayName: 'Mai' }, robot: { id: 'device-1', displayName: 'Tbot' },
} as unknown as RewardReceipt;

const emptyDashboard = {
  activeLearning: null, sessions: [], courses: [],
  completedLessons: 0, totalLessons: 0, completedSessions: 0, failedSessions: 0,
  recentDurationSec: 0, todayLessonsCompleted: 0, todayActiveSec: 0,
};

describe('T3.3 — a child with no lesson history sees honest empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboard.mockReturnValue({ data: emptyDashboard, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() } as never);
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isError: false, refetch: jest.fn() } as never);
    mockAcknowledge.mockReturnValue({ mutate: jest.fn() } as never);
    mockSeenQueued.mockResolvedValue(false);
  });

  it('the dashboard reports zero without inventing activity', () => {
    const screen = wrap(<TodayProgressScreen navigation={navigation as never} route={{ key: 't', name: 'TodayProgressScreen' } as never} />);
    expect(screen.getByText('No practice yet')).toBeTruthy();
    expect(screen.getByText('No course path yet')).toBeTruthy();
    expect(screen.getByText('Finish a lesson on Robot to fill in your progress.')).toBeTruthy();
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('the words screen shows no practised words instead of sample vocabulary', () => {
    const screen = wrap(<WordsPracticedScreen navigation={navigation as never} route={{ key: 'w', name: 'WordsPracticedScreen' } as never} />);
    expect(screen.getByText('No practised words yet')).toBeTruthy();
    // The screen used to hard-code these as if the child had practised them.
    for (const fabricated of ['Hello', 'Cat', 'Happy', 'Friend', 'Dog']) {
      expect(screen.queryByText(fabricated)).toBeNull();
    }
    expect(screen.queryByText('These words got stronger today.')).toBeNull();
  });

  it('the lesson summary waits for a real reward rather than showing one', () => {
    const screen = wrap(<LessonSummaryScreen navigation={navigation as never} route={{ key: 's', name: 'LessonSummaryScreen', params: undefined } as never} />);
    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('Celebrate reward')).toBeNull();
  });

  it('the celebration screen degrades to a waiting state with no reward in the inbox', async () => {
    const screen = wrap(<CelebrationScreen navigation={navigation as never} route={{ key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } } as never} />);
    await waitFor(() => expect(screen.getByText('Reward is waiting to sync')).toBeTruthy());
    expect(screen.queryByTestId('celebration-confetti')).toBeNull();
    expect(screen.queryByTestId('celebration-static-stars')).toBeNull();
  });
});

describe('T3.3 — the celebration is not replayed on re-entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInbox.mockReturnValue({ data: { rewards: [reward], count: 1 }, isError: false, refetch: jest.fn() } as never);
    mockAcknowledge.mockReturnValue({ mutate: jest.fn() } as never);
    mockSeenQueued.mockResolvedValue(false);
  });

  const celebrationRoute = { key: 'c', name: 'CelebrationScreen', params: { rewardId: 'reward-1' } };

  it('acknowledges an unseen reward exactly once while it is on screen', async () => {
    const mutate = jest.fn();
    mockAcknowledge.mockReturnValue({ mutate } as never);

    const screen = wrap(<CelebrationScreen navigation={navigation as never} route={celebrationRoute as never} />);
    await waitFor(() => expect(screen.getByText('You did it!')).toBeTruthy());
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('reward-1'));

    // A re-render (inbox refetch, language change, …) must not re-fire the receipt.
    screen.rerender(<CelebrationScreen navigation={navigation as never} route={celebrationRoute as never} />);
    expect(mutate).toHaveBeenCalledTimes(1);
    screen.unmount();
  });

  it('does not celebrate again when the seen receipt is already queued offline', async () => {
    // The acknowledgement failed and was queued: the reward is still in the local
    // inbox, but the child has already had their celebration.
    mockSeenQueued.mockResolvedValue(true);
    const mutate = jest.fn();
    mockAcknowledge.mockReturnValue({ mutate } as never);

    const screen = wrap(<CelebrationScreen navigation={navigation as never} route={celebrationRoute as never} />);

    await waitFor(() => expect(screen.getByText('Reward is waiting to sync')).toBeTruthy());
    expect(screen.queryByText('You did it!')).toBeNull();
    expect(screen.queryByTestId('celebration-confetti')).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
    screen.unmount();
  });

  it('does not celebrate again once the reward has left the inbox', async () => {
    mockInbox.mockReturnValue({ data: { rewards: [], count: 0 }, isError: false, refetch: jest.fn() } as never);
    const mutate = jest.fn();
    mockAcknowledge.mockReturnValue({ mutate } as never);

    const screen = wrap(<CelebrationScreen navigation={navigation as never} route={celebrationRoute as never} />);

    await waitFor(() => expect(screen.getByText('Reward is waiting to sync')).toBeTruthy());
    expect(screen.queryByText('You did it!')).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
    screen.unmount();
  });
});
