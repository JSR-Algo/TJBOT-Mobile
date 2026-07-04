import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react-native';
import { PENDING_DEVICE_SETUP_ROUTE } from '@/navigation/featureRegistry';
import { RootStackNavigator } from '@/navigation/RootStackNavigator';
import { ROUTES } from '@/navigation/routes';
import type { NavigationDeepLinkTarget } from '@/navigation/linking';

const root = join(__dirname, '..', '..');

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

type HouseholdState = {
  onboardingComplete: boolean;
  pendingDeviceSetup: boolean;
  protectedInitialRoute: string;
  isLoading: boolean;
  activeHousehold: { id: string } | null;
  children: Array<{ id: string }>;
};

const mockAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
};

const mockHouseholdState: HouseholdState = {
  onboardingComplete: false,
  pendingDeviceSetup: false,
  protectedInitialRoute: ROUTES.HomeHubScreen,
  isLoading: false,
  activeHousehold: null,
  children: [],
};

const mockCreateElement = React.createElement;

jest.mock('@/config/investorDemo', () => ({
  isInvestorDemoEnabled: jest.fn(() => false),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => mockHouseholdState,
}));

jest.mock('@/features/onboarding/ageGate', () => ({
  readAgeAnswer: jest.fn(() => Promise.resolve({ band: 'over13' })),
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

describe('RootNavigator', () => {
  beforeEach(() => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.isLoading = false;
    mockHouseholdState.onboardingComplete = false;
    mockHouseholdState.pendingDeviceSetup = false;
    mockHouseholdState.protectedInitialRoute = ROUTES.HomeHubScreen;
    mockHouseholdState.isLoading = false;
    mockHouseholdState.activeHousehold = null;
    mockHouseholdState.children = [];
  });

  it('shows auth stack when session is unauthenticated', async () => {
    render(<RootStackNavigator />);

    expect(await screen.findByTestId('auth-stack')).toBeTruthy();
  });

  it('shows onboarding stack when authenticated session has not completed onboarding', async () => {
    mockAuthState.isAuthenticated = true;

    render(<RootStackNavigator />);

    expect(await screen.findByTestId('onboarding-stack')).toBeTruthy();
  });

  it('keeps the loading gate while authenticated household state resolves', () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.isLoading = true;

    render(<RootStackNavigator />);

    expect(screen.queryByTestId('auth-stack')).toBeNull();
    expect(screen.queryByTestId('onboarding-stack')).toBeNull();
    expect(screen.queryByTestId('protected-stack')).toBeNull();
  });

  it('shows protected main stack when authenticated session completed onboarding', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    render(<RootStackNavigator />);

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
  });

  it('keeps authenticated users out of onboarding after device first-run is complete', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.activeHousehold = null;
    mockHouseholdState.children = [];

    render(<RootStackNavigator />);

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
    expect(screen.queryByTestId('onboarding-stack')).toBeNull();
  });

  it('starts protected stack at pairing when onboarding requests device setup', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.pendingDeviceSetup = true;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    render(<RootStackNavigator />);

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(PENDING_DEVICE_SETUP_ROUTE);
  });

  it('starts protected stack at requested first lesson route after onboarding completion', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.protectedInitialRoute = ROUTES.LessonReadyScreen;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    render(<RootStackNavigator />);

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.LessonReadyScreen);
  });

  it('preserves pending deep-link params when protected stack becomes available', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    const target: NavigationDeepLinkTarget<typeof ROUTES.ParentSummaryScreen> = {
      name: ROUTES.ParentSummaryScreen,
      params: { deviceId: 'device-1', summaryDate: '2026-05-16' },
    };

    render(<RootStackNavigator pendingDeepLinkTarget={target} />);

    const protectedStack = await screen.findByTestId('protected-stack');
    expect(protectedStack.props.children).toBe(ROUTES.ParentSummaryScreen);
    expect(protectedStack.props.initialRouteParams).toEqual({ deviceId: 'device-1', summaryDate: '2026-05-16' });
  });

  it('derives protected entry routes from feature registry metadata', () => {
    const source = readFileSync(join(root, 'src', 'navigation', 'RootStackNavigator.tsx'), 'utf8');

    expect(source).toContain('PROTECTED_DEFAULT_ROUTE');
    expect(source).toContain('PENDING_DEVICE_SETUP_ROUTE');
    expect(source).not.toContain(`'${ROUTES.HomeHubScreen}'`);
    expect(source).not.toContain(`'${ROUTES.PairIntroScreen}'`);
  });

  it('does not let household state own protected entry route literals', () => {
    const source = readFileSync(join(root, 'src', 'contexts', 'HouseholdContext.tsx'), 'utf8');

    expect(source).not.toContain(`'${ROUTES.HomeHubScreen}'`);
    expect(source).not.toContain(`'${ROUTES.PairIntroScreen}'`);
  });

  it('derives protected modal shell entry from feature registry metadata', () => {
    const source = readFileSync(join(root, 'src', 'navigation', 'ModalNavigator.tsx'), 'utf8');

    expect(source).toContain('PROTECTED_DEFAULT_ROUTE');
    expect(source).not.toContain(`'${ROUTES.HomeHubScreen}'`);
  });

  it('derives pending device setup route from explicit device feature entry metadata', () => {
    const source = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');

    expect(source).toContain('pendingDeviceSetupRoute()');
    expect(source).toContain('feature.pendingDeviceSetupRoute');
    expect(source).not.toContain('DEVICE_SCREENS[0].name');
    expect(source).not.toContain("featureByOwner('device')");
  });

  it('keys root branch navigators so logout and auth transitions reset stale stacks', () => {
    const source = readFileSync(join(root, 'src', 'navigation', 'RootStackNavigator.tsx'), 'utf8');

    expect(source).toContain('<AuthNavigator key="auth" />');
    expect(source).toContain('<OnboardingNavigator key="onboarding" />');
    expect(source).toContain('<ModalNavigator key="protected"');
  });
});
