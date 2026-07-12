import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MyRobotScreen from '@/features/robot-mgmt/screens/MyRobotScreen';

const mockPreference = jest.fn();
const mockMutation = jest.fn();

jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeChild: { id: 'child-1', name: 'Mai' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useActiveChildRobotQuery: () => ({ data: { id: 'robot-1', name: 'Tee', online: true, batteryPercent: 78 }, isLoading: false, isError: false }),
  useLeaderboardPreferenceQuery: () => mockPreference(),
  useLeaderboardPreferenceMutation: () => ({ mutate: mockMutation, isPending: false }),
}));

describe('MyRobotScreen leaderboard preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreference.mockReturnValue({ data: { deviceId: 'robot-1', optedIn: false }, isLoading: false, isError: false, refetch: jest.fn() });
  });

  it('shows the active child robot and explicit opt-in control', () => {
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    expect(screen.getByText('Tee')).toBeTruthy();
    expect(screen.getByText('Mai')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Join leaderboard for Tee'));
    expect(mockMutation).toHaveBeenCalledWith(true);
  });

  it('offers opt-out only for the resolved robot', () => {
    mockPreference.mockReturnValue({ data: { deviceId: 'robot-1', optedIn: true }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    fireEvent.press(screen.getByLabelText('Leave leaderboard for Tee'));
    expect(mockMutation).toHaveBeenCalledWith(false);
  });

  it('does not claim privacy or allow mutation while preference is unresolved', () => {
    mockPreference.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() });
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    expect(screen.queryByText('Private by default')).toBeNull();
    expect(screen.getByLabelText('Leaderboard preference loading').props.accessibilityState.disabled).toBe(true);
  });

  it('shows a retry instead of a privacy claim when preference loading fails', () => {
    const refetch = jest.fn();
    mockPreference.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    render(<MyRobotScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'r', name: 'MyRobotScreen' } as never} />);
    expect(screen.queryByText('Private by default')).toBeNull();
    fireEvent.press(screen.getByLabelText('Retry leaderboard preference'));
    expect(refetch).toHaveBeenCalled();
  });
});
