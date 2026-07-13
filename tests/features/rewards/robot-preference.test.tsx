import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MyRobotScreen from '@/features/robot-mgmt/screens/MyRobotScreen';

const mockLeaderboard = jest.fn();
const mockMutation = jest.fn();
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: { id: 'house-1' }, activeChild: { id: 'child-1', name: 'Mai' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useActiveChildRobotQuery: () => ({ data: { id: 'robot-1', name: 'Tee', online: true }, isLoading: false, isError: false }),
  useLeaderboardQuery: () => mockLeaderboard(),
  useLeaderboardPreferenceMutation: () => ({ mutate: mockMutation, isPending: false, isError: false }),
}));

const privateRobot = { rank: null, rankStatus: 'private', robotId: 'robot-1', childName: 'Mai', robotName: 'Tee', parentEmailMasked: '[hidden]', xp: 90, completedLessonCount: 3, currentStreakDays: 2, badges: [], optedIn: false, visibility: 'private' };

describe('MyRobotScreen leaderboard privacy', () => {
  beforeEach(() => { jest.clearAllMocks(); mockLeaderboard.mockReturnValue({ data: { ownedRows: [privateRobot] }, isLoading: false, isError: false, refetch: jest.fn() }); });

  it('explains that private rewards persist and opts in only the resolved robot', () => {
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    expect(screen.getByText('Rewards and history stay private even when your robot is hidden.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Join leaderboard for Tee'));
    expect(mockMutation).toHaveBeenCalledWith(true);
  });

  it('uses server-owned row state for opt-out', () => {
    mockLeaderboard.mockReturnValue({ data: { ownedRows: [{ ...privateRobot, rank: 9, rankStatus: 'current', optedIn: true, visibility: 'public' }] }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    fireEvent.press(screen.getByLabelText('Leave leaderboard for Tee'));
    expect(mockMutation).toHaveBeenCalledWith(false);
  });
});
