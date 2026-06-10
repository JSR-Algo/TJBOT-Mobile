import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import HomeHubScreen from '@/features/home/screens/HomeHubScreen';

jest.mock('@/features/home/hooks/useHomeState', () => {
  const { ROUTES: ROUTE_VALUES } = jest.requireActual('@/navigation/routes');
  return {
    useHomeState: () => ({
      isLoading: false,
      variant: 'daily_available',
      cfg: {
        emotion: 'happy',
        accent: '#FF6F61',
        chip: null,
        ctaLabel: 'Set up a child',
        ctaIcon: '👶',
        ctaColor: '#FF6F61',
        ctaTarget: ROUTE_VALUES.ParentSummaryScreen,
        ctaEnabled: true,
        reviewBadge: null,
        courseBadge: null,
        dimSecondary: false,
        forceGreet: false,
        quickActions: [],
      },
    }),
  };
});

describe('HomeHubScreen parent entry', () => {
  it('opens parent surfaces directly without routing through ParentGateScreen', () => {
    const navigation = { navigate: jest.fn() };

    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText('Open parent dashboard'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);

    fireEvent.press(screen.getByLabelText('Open parent settings'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ParentSettingsScreen);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.ParentGateScreen);
  });

  it('shows a direct Robot entry from Home so device setup is discoverable', () => {
    const navigation = { navigate: jest.fn() };

    const screen = render(
      <HomeHubScreen navigation={navigation as never} route={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText('Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceOverviewScreen);
  });
});
