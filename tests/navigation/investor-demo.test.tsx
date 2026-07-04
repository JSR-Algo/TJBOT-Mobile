const mockCreateElement = require('react').createElement;

jest.mock('@/config/investorDemo', () => ({
  isInvestorDemoEnabled: jest.fn(() => false),
}));

jest.mock('@/navigation/featureRegistry', () => ({
  PROTECTED_DEFAULT_ROUTE: jest.requireActual('@/navigation/routes').ROUTES.HomeHubScreen,
  PENDING_DEVICE_SETUP_ROUTE: jest.requireActual('@/navigation/routes').ROUTES.PairIntroScreen,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => ({
    onboardingComplete: false,
    pendingDeviceSetup: false,
    protectedInitialRoute: jest.requireActual('@/navigation/routes').ROUTES.HomeHubScreen,
    isLoading: false,
  }),
}));

jest.mock('@/features/onboarding/ageGate', () => ({
  readAgeAnswer: jest.fn(() => Promise.resolve({ band: '18_PLUS', role: 'adult', answeredAt: '2026-06-20T00:00:00.000Z' })),
  writeAgeAnswer: jest.fn(() => Promise.resolve()),
  roleForAgeBand: jest.fn(() => 'adult'),
  AGE_BANDS: [],
}));

jest.mock('@/navigation/AgeScreen', () => ({
  __esModule: true,
  default: () => mockCreateElement('Text', { testID: 'age-screen' }, 'AgeScreen'),
}));

jest.mock('@/navigation/AuthNavigator', () => ({
  AuthNavigator: () => mockCreateElement('Text', { testID: 'auth-stack' }, 'AuthNavigator'),
}));

jest.mock('@/navigation/OnboardingNavigator', () => ({
  OnboardingNavigator: () => mockCreateElement('Text', { testID: 'onboarding-stack' }, 'OnboardingNavigator'),
}));

jest.mock('@/navigation/ModalNavigator', () => ({
  ModalNavigator: ({ initialRouteName, initialRouteParams }: { initialRouteName?: string; initialRouteParams?: unknown }) => {
    const { ROUTES: mockRoutes } = jest.requireActual('@/navigation/routes');
    return mockCreateElement(
      'Text',
      { testID: 'protected-stack', initialRouteParams },
      initialRouteName ?? mockRoutes.HomeHubScreen,
    );
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import { RootStackNavigator } from '@/navigation/RootStackNavigator';

const { isInvestorDemoEnabled } = jest.requireMock('@/config/investorDemo') as {
  isInvestorDemoEnabled: jest.Mock;
};

describe('RootStackNavigator investor demo', () => {
  beforeEach(() => {
    isInvestorDemoEnabled.mockReturnValue(false);
  });

  it('skips age, auth, and onboarding when investor demo is enabled', async () => {
    isInvestorDemoEnabled.mockReturnValue(true);

    render(<RootStackNavigator />);

    expect(await screen.findByTestId('protected-stack')).toBeTruthy();
    expect(screen.queryByTestId('auth-stack')).toBeNull();
    expect(screen.queryByTestId('onboarding-stack')).toBeNull();
    expect(screen.queryByTestId('age-screen')).toBeNull();
    expect(screen.getByTestId('protected-stack').props.children).toBe(ROUTES.HomeHubScreen);
  });

  it('honors pending deep links in investor demo mode', async () => {
    isInvestorDemoEnabled.mockReturnValue(true);

    render(
      <RootStackNavigator
        pendingDeepLinkTarget={{
          name: ROUTES.RobotCompanionScreen,
          params: { lessonId: 'w01-d01-barn-say-it', ageBand: '4-6', autoStartVoice: true },
        }}
      />,
    );

    const protectedStack = await screen.findByTestId('protected-stack');
    expect(protectedStack.props.children).toBe(ROUTES.RobotCompanionScreen);
    expect(protectedStack.props.initialRouteParams).toEqual({
      lessonId: 'w01-d01-barn-say-it',
      ageBand: '4-6',
      autoStartVoice: true,
    });
  });

  it('does not force pairing entry in investor demo mode', async () => {
    isInvestorDemoEnabled.mockReturnValue(true);

    render(<RootStackNavigator />);

    expect((await screen.findByTestId('protected-stack')).props.children).not.toBe(ROUTES.PairIntroScreen);
  });
});
