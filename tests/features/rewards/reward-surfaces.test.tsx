import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';
import { ROUTES } from '@/navigation/routes';

const mockInbox = jest.fn();
const mockRobot = jest.fn();
const mockMutate = jest.fn();

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => ({ activeChild: { id: 'child-1', name: 'Mai' }, children: [{ id: 'child-1', name: 'Mai' }] }),
}));

jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useActiveChildRobotQuery: () => mockRobot(),
  useRewardForCompletionQuery: () => mockInbox(),
  useAcknowledgeRewardMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock('@/design-system/animations/useReduceMotion', () => ({
  useReduceMotion: () => true,
}));

const reward = {
  id: 'reward-1', assignmentId: 'assign-1', sessionId: 'session-1', lessonId: 'lesson-1',
  childId: 'child-1', deviceId: 'robot-1', xp: 30, coins: 5,
  badgeKey: 'brave-speaker', badgeName: 'Brave Speaker', grantedAt: '2026-07-13T01:00:00.000Z', seenAt: null,
};

function navigation() {
  return { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
}

function route(name: 'LessonSummaryScreen' | 'CelebrationScreen') {
  return { key: name, name, params: { childId: 'child-1', lessonId: 'lesson-1', assignmentId: 'assign-1', deviceId: 'robot-1', sessionId: 'session-1' } };
}

describe('persisted reward surfaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRobot.mockReturnValue({ data: { id: 'robot-1', name: 'Tee' }, isLoading: false, isError: false });
    mockInbox.mockReturnValue({ data: reward, isLoading: false, isError: false, refetch: jest.fn() });
  });

  it('renders only the assignment-bound persisted award in lesson summary', () => {
    render(<LessonSummaryScreen navigation={navigation() as never} route={route('LessonSummaryScreen') as never} />);
    expect(screen.getByText('30 XP')).toBeTruthy();
    expect(screen.getByText('5 coins')).toBeTruthy();
    expect(screen.queryByText('12 stars')).toBeNull();
  });

  it('shows an explicit waiting state when the authoritative award has not synced', () => {
    mockInbox.mockReturnValue({ data: null, isLoading: false, isError: false, refetch: jest.fn() });
    render(<LessonSummaryScreen navigation={navigation() as never} route={route('LessonSummaryScreen') as never} />);
    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
  });

  it('opens celebration for the same immutable reward', () => {
    const nav = navigation();
    render(<LessonSummaryScreen navigation={nav as never} route={route('LessonSummaryScreen') as never} />);
    fireEvent.press(screen.getByText('Celebrate reward'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.CelebrationScreen, expect.objectContaining({ rewardId: 'reward-1', assignmentId: 'assign-1' }));
  });

  it('acknowledges an unseen reward once and uses static reduced-motion decoration', async () => {
    const view = render(<CelebrationScreen navigation={navigation() as never} route={{ ...route('CelebrationScreen'), params: { ...route('CelebrationScreen').params, rewardId: 'reward-1' } } as never} />);
    expect(screen.getByText('Brave Speaker')).toBeTruthy();
    expect(view.UNSAFE_getByProps({ testID: 'celebration-static-stars' }).props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByTestId('celebration-confetti')).toBeNull();
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate).toHaveBeenCalledWith('reward-1');
  });

  it('does not acknowledge or label an already-seen reward as new', () => {
    mockInbox.mockReturnValue({ data: { ...reward, seenAt: '2026-07-13T02:00:00.000Z' }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<CelebrationScreen navigation={navigation() as never} route={{ ...route('CelebrationScreen'), params: { ...route('CelebrationScreen').params, rewardId: 'reward-1' } } as never} />);
    expect(screen.getByText('Reward earned')).toBeTruthy();
    expect(screen.queryByText('New reward')).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('celebration-static-stars')).toBeNull();
  });

  it('does not offer celebration again for an already-seen history reward', () => {
    mockInbox.mockReturnValue({ data: { ...reward, seenAt: '2026-07-13T02:00:00.000Z' }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<LessonSummaryScreen navigation={navigation() as never} route={route('LessonSummaryScreen') as never} />);
    expect(screen.queryByText('Celebrate reward')).toBeNull();
  });

  it('shows a held configuration state instead of promising a reconnect award', () => {
    mockInbox.mockReturnValue({ data: { ...reward, status: 'held', configurationErrorCode: 'robot_child_assignment_inactive' }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<LessonSummaryScreen navigation={navigation() as never} route={route('LessonSummaryScreen') as never} />);
    expect(screen.getByText('Reward needs parent attention')).toBeTruthy();
    expect(screen.queryByText('Reward is waiting to sync')).toBeNull();
  });

  it('rejects a reward whose immutable completion identity does not match the route', () => {
    mockInbox.mockReturnValue({ data: { ...reward, childId: 'child-2' }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<LessonSummaryScreen navigation={navigation() as never} route={route('LessonSummaryScreen') as never} />);
    expect(screen.queryByText('30 XP')).toBeNull();
    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
  });

  it('keeps an already-seen history fallback visible', () => {
    mockInbox.mockReturnValue({ data: { ...reward, seenAt: '2026-07-13T02:00:00.000Z' }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<CelebrationScreen navigation={navigation() as never} route={{ ...route('CelebrationScreen'), params: { ...route('CelebrationScreen').params, rewardId: 'reward-1' } } as never} />);
    expect(screen.getByText('Reward earned')).toBeTruthy();
    expect(screen.queryByText('Reward is waiting to sync')).toBeNull();
  });
});
