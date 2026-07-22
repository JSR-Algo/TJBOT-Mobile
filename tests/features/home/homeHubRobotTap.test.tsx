import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HomeHubScreen from '../../../src/features/home/screens/HomeHubScreen';
import { ROUTES } from '../../../src/navigation/routes';

jest.mock('../../../src/features/home/hooks/useHomeState', () => ({
  useHomeState: () => ({
    variant: 'daily_available',
    isLoading: false,
    cfg: {
      chip: null,
      forceGreet: false,
      ctaLabel: 'Start lesson',
      ctaTarget: 'LessonReadyScreen',
      ctaColor: '#FF6B6F',
      ctaEnabled: true,
      dimSecondary: false,
      reviewBadge: undefined,
    },
  }),
}));

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('HomeHub robot tap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens companion chat before the barn lesson', () => {
    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{ key: 'home', name: ROUTES.HomeHubScreen }} />,
    );

    fireEvent.press(screen.getByLabelText('Talk to Robot before barn lesson'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotCompanionScreen, {
      lessonId: 'w01-d01-barn-say-it',
      ageBand: '4-6',
      autoStartVoice: true,
    });
  });

  it('renders the three Sleek home actions without the legacy garden dashboard', () => {
    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{ key: 'home', name: ROUTES.HomeHubScreen }} />,
    );

    expect(screen.getByText('Hi, friend!')).toBeTruthy();
    expect(screen.getByText('Course')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.queryByText('My Garden')).toBeNull();
  });
});
