import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MyRobotScreen from '@/features/robot-mgmt/screens/MyRobotScreen';

const mockLeaderboard = jest.fn();
const mockMutations = new Map<string, jest.Mock>();
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: { id: 'house-1' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useLeaderboardQuery: () => mockLeaderboard(),
  useLeaderboardPreferenceMutation: (_scope: string, deviceId: string) => ({ mutate: (value: boolean) => mockMutations.get(deviceId)?.(value), isPending: false, isError: false }),
}));

const row = (robotId: string, robotName: string, optedIn: boolean) => ({ rank: optedIn ? 9 : null, rankStatus: optedIn ? 'current' : 'private', robotId, childName: robotId === 'r1' ? 'Mai' : 'An', robotName, parentEmailMasked: optedIn ? 'ma***@example.com' : '[hidden]', xp: 90, completedLessonCount: 3, currentStreakDays: 2, badges: [], optedIn, visibility: optedIn ? 'public' : 'private' });

describe('MyRobotScreen leaderboard privacy', () => {
  beforeEach(() => { jest.clearAllMocks(); mockMutations.clear(); mockMutations.set('r1', jest.fn()); mockMutations.set('r2', jest.fn()); mockLeaderboard.mockReturnValue({ data: { ownedRows: [row('r1', 'Tee', false), row('r2', 'Nova', true)] }, isLoading: false, isError: false, refetch: jest.fn() }); });

  it('renders and manages every owned robot including opted-out rows', () => {
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    fireEvent.press(screen.getByLabelText('Join leaderboard for Tee'));
    fireEvent.press(screen.getByLabelText('Leave leaderboard for Nova'));
    expect(mockMutations.get('r1')).toHaveBeenCalledWith(true);
    expect(mockMutations.get('r2')).toHaveBeenCalledWith(false);
  });

  it('does not render fabricated robot status, battery, wifi, course, or microphone truth', () => {
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    expect(screen.queryByText(/78%|Casa-Familia|3 installed|Working|all good/)).toBeNull();
  });

  it('renders explicit loading, error, and empty owned-robot states', () => {
    mockLeaderboard.mockReturnValueOnce({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() });
    const loading = render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'a', name: 'MyRobotScreen' } as never} />);
    expect(loading.getByText('Loading owned robots')).toBeTruthy();
    loading.unmount();
    mockLeaderboard.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() });
    const error = render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'b', name: 'MyRobotScreen' } as never} />);
    expect(error.getByText('Owned robots unavailable')).toBeTruthy();
    error.unmount();
    mockLeaderboard.mockReturnValueOnce({ data: { ownedRows: [] }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'c', name: 'MyRobotScreen' } as never} />);
    expect(screen.getByText('No owned robots available')).toBeTruthy();
  });
});
