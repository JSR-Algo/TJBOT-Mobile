// LessonSummaryScreen shows the end-of-lesson recap with two CTAs:
//   - "Keep going" (PrimaryCTA) -> navigate(SendToRobotScreen)
//   - "Stop for today" (TouchableOpacity) -> navigate(HomeHubScreen)
// The two onPress handlers (source lines 46-47) were uncovered. These tests
// render the screen and fire each press to drive both navigation calls.

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';

jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: { id: 'house-1' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({
  useRewardInboxQuery: () => ({ data: { rewards: [], count: 0 }, isError: false, refetch: jest.fn() }),
}));

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 's', name: ROUTES.LessonSummaryScreen, params: undefined };
  render(
    <LessonSummaryScreen navigation={navigation as never} route={route as never} />,
  );
  return navigation;
}

describe('LessonSummaryScreen', () => {
  it('renders the persisted-reward waiting state without static awards', () => {
    renderScreen();
    expect(screen.getByText('Great effort!')).toBeTruthy();
    expect(screen.getByText('Reward is waiting to sync')).toBeTruthy();
    expect(screen.queryByText('12 stars')).toBeNull();
  });

  it('"Keep going" routes to SendToRobotScreen', () => {
    const navigation = renderScreen();
    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
  });

  it('"Stop for today" routes to HomeHubScreen', () => {
    const navigation = renderScreen();
    fireEvent.press(screen.getByText('Stop for today'));
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});
