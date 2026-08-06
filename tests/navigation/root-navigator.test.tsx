import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, render, screen, type RenderAPI } from '@testing-library/react-native';
import { readRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import type { LessonCheckpoint } from '@/features/fallback/recoveryTypes';
import { PENDING_DEVICE_SETUP_ROUTE } from '@/navigation/featureRegistry';
import { RootStackNavigator } from '@/navigation/RootStackNavigator';
import { ROUTES } from '@/navigation/routes';
import type { NavigationDeepLinkTarget } from '@/navigation/linking';
import { captureError } from '@/services/observability/sentry';

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
const mockedReadRecoveryCheckpoint = jest.mocked(readRecoveryCheckpoint);
const mockedCaptureError = jest.mocked(captureError);
let consoleErrorSpy: jest.SpyInstance<void, Parameters<typeof console.error>>;

const checkpoint: LessonCheckpoint = {
  version: 1,
  lessonTitle: 'Space Explorers',
  progressLabel: '3 of 5',
  resumeTarget: ROUTES.RunningScreen,
  reason: 'network',
  phase: 'listening',
  sessionState: 'active',
  authState: 'authenticated',
  deviceId: 'device-1',
  assignmentId: 'assignment-1',
  sessionId: 'session-1',
};

async function renderRoot(element: React.ReactElement = <RootStackNavigator />): Promise<RenderAPI> {
  const api = render(element);
  await act(async () => {
    await Promise.resolve();
  });
  return api;
}

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => mockHouseholdState,
}));

jest.mock('@/features/onboarding/ageGate', () => ({
  readAgeAnswer: jest.fn(() => Promise.resolve({ band: 'over13' })),
  writeAgeAnswer: jest.fn(() => Promise.resolve()),
  AGE_BANDS: [],
}));

jest.mock('@/features/fallback/recoveryCheckpointStore', () => ({
  readRecoveryCheckpoint: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/services/observability/sentry', () => ({
  captureError: jest.fn(),
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
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockAuthState.isAuthenticated = false;
    mockAuthState.isLoading = false;
    mockHouseholdState.onboardingComplete = false;
    mockHouseholdState.pendingDeviceSetup = false;
    mockHouseholdState.protectedInitialRoute = ROUTES.HomeHubScreen;
    mockHouseholdState.isLoading = false;
    mockHouseholdState.activeHousehold = null;
    mockHouseholdState.children = [];
    mockedReadRecoveryCheckpoint.mockReset();
    mockedReadRecoveryCheckpoint.mockResolvedValue(null);
    mockedCaptureError.mockReset();
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('shows auth stack when session is unauthenticated', async () => {
    mockedReadRecoveryCheckpoint.mockImplementation(() => new Promise(() => undefined));

    await renderRoot();

    expect(await screen.findByTestId('auth-stack')).toBeTruthy();
  });

  it('shows onboarding stack when authenticated session has not completed onboarding', async () => {
    mockAuthState.isAuthenticated = true;

    await renderRoot();

    expect(await screen.findByTestId('onboarding-stack')).toBeTruthy();
  });

  it('keeps the loading gate while authenticated household state resolves', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.isLoading = true;

    await renderRoot();

    expect(screen.queryByTestId('auth-stack')).toBeNull();
    expect(screen.queryByTestId('onboarding-stack')).toBeNull();
    expect(screen.queryByTestId('protected-stack')).toBeNull();
  });

  it('shows protected main stack when authenticated session completed onboarding', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    await renderRoot();

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
  });

  it('keeps the boot loading gate while the recovery checkpoint resolves', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    let resolveCheckpoint: ((value: LessonCheckpoint | null) => void) | undefined;
    mockedReadRecoveryCheckpoint.mockImplementation(() => new Promise((resolve) => {
      resolveCheckpoint = resolve;
    }));

    render(<RootStackNavigator />);

    expect(screen.queryByTestId('auth-stack')).toBeNull();
    expect(screen.queryByTestId('onboarding-stack')).toBeNull();
    expect(screen.queryByTestId('protected-stack')).toBeNull();

    await act(async () => {
      resolveCheckpoint?.(null);
      await Promise.resolve();
    });

    expect(mockedReadRecoveryCheckpoint).toHaveBeenCalledTimes(1);
    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
  });

  it('continues normal routing when the recovery checkpoint read rejects', async () => {
    mockedReadRecoveryCheckpoint.mockRejectedValue(new Error('secure storage unavailable'));

    await renderRoot();

    expect(mockedReadRecoveryCheckpoint).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('auth-stack')).toBeTruthy();
  });

  it('times out a hanging recovery checkpoint read and continues normal routing', async () => {
    jest.useFakeTimers();
    try {
      mockAuthState.isAuthenticated = true;
      mockHouseholdState.onboardingComplete = true;
      mockedReadRecoveryCheckpoint.mockImplementation(() => new Promise(() => undefined));

      render(<RootStackNavigator />);
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByTestId('protected-stack')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(5_000);
        await Promise.resolve();
      });

      expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
      expect(mockedCaptureError).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Recovery checkpoint bootstrap timed out'),
      }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('starts protected navigation at lesson resume with the loaded checkpoint', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockedReadRecoveryCheckpoint.mockResolvedValue(checkpoint);

    await renderRoot();

    const protectedStack = await screen.findByTestId('protected-stack');
    expect(protectedStack.props.children).toBe(ROUTES.LessonResumeScreen);
    expect(protectedStack.props.initialRouteParams).toEqual({ checkpoint });
  });

  it('retains a checkpoint through auth and continues recovery after authentication', async () => {
    mockedReadRecoveryCheckpoint.mockResolvedValue(checkpoint);
    const api = await renderRoot();

    expect(await screen.findByTestId('auth-stack')).toBeTruthy();

    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    api.rerender(<RootStackNavigator />);

    const protectedStack = await screen.findByTestId('protected-stack');
    expect(protectedStack.props.children).toBe(ROUTES.LessonResumeScreen);
    expect(protectedStack.props.initialRouteParams).toEqual({ checkpoint });
    expect(mockedReadRecoveryCheckpoint).toHaveBeenCalledTimes(1);
  });

  it('requalifies an expired checkpoint after authentication without mutating the loaded value', async () => {
    const expiredCheckpoint = { ...checkpoint, authState: 'expired' } satisfies LessonCheckpoint;
    mockedReadRecoveryCheckpoint.mockResolvedValue(expiredCheckpoint);
    const api = await renderRoot();

    expect(await screen.findByTestId('auth-stack')).toBeTruthy();

    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    api.rerender(<RootStackNavigator />);

    const protectedStack = await screen.findByTestId('protected-stack');
    expect(protectedStack.props.children).toBe(ROUTES.LessonResumeScreen);
    expect(protectedStack.props.initialRouteParams).toEqual({
      checkpoint: { ...expiredCheckpoint, authState: 'authenticated' },
    });
    expect(expiredCheckpoint.authState).toBe('expired');
  });

  it('keeps onboarding ahead of pending lesson recovery', async () => {
    mockAuthState.isAuthenticated = true;
    mockedReadRecoveryCheckpoint.mockResolvedValue(checkpoint);

    await renderRoot();

    expect(await screen.findByTestId('onboarding-stack')).toBeTruthy();
    expect(screen.queryByTestId('protected-stack')).toBeNull();
  });

  it('keeps pending device setup ahead of pending lesson recovery', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.pendingDeviceSetup = true;
    mockedReadRecoveryCheckpoint.mockResolvedValue(checkpoint);

    await renderRoot();

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(PENDING_DEVICE_SETUP_ROUTE);
  });

  it('keeps the existing pending deep-link precedence ahead of lesson recovery', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockedReadRecoveryCheckpoint.mockResolvedValue(checkpoint);
    const target: NavigationDeepLinkTarget<typeof ROUTES.ParentSummaryScreen> = {
      name: ROUTES.ParentSummaryScreen,
      params: { deviceId: 'device-2', summaryDate: '2026-08-07' },
    };

    await renderRoot(<RootStackNavigator pendingDeepLinkTarget={target} />);

    const protectedStack = await screen.findByTestId('protected-stack');
    expect(protectedStack.props.children).toBe(ROUTES.ParentSummaryScreen);
    expect(protectedStack.props.initialRouteParams).toEqual(target.params);
  });

  it('does not repeat checkpoint reads across auth rerenders', async () => {
    const api = await renderRoot();

    mockAuthState.isLoading = true;
    api.rerender(<RootStackNavigator />);
    mockAuthState.isLoading = false;
    api.rerender(<RootStackNavigator />);

    expect(mockedReadRecoveryCheckpoint).toHaveBeenCalledTimes(1);
  });

  it('ignores a checkpoint read that resolves after unmount', async () => {
    let resolveCheckpoint: ((value: LessonCheckpoint | null) => void) | undefined;
    mockedReadRecoveryCheckpoint.mockImplementation(() => new Promise((resolve) => {
      resolveCheckpoint = resolve;
    }));
    const api = render(<RootStackNavigator />);

    await act(async () => {
      await Promise.resolve();
    });

    api.unmount();
    await act(async () => {
      resolveCheckpoint?.(checkpoint);
      await Promise.resolve();
    });

    expect(mockedReadRecoveryCheckpoint).toHaveBeenCalledTimes(1);
  });

  it('keeps authenticated users out of onboarding after device first-run is complete', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.activeHousehold = null;
    mockHouseholdState.children = [];

    await renderRoot();

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
    expect(screen.queryByTestId('onboarding-stack')).toBeNull();
  });

  it('starts protected stack at pairing when onboarding requests device setup', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.pendingDeviceSetup = true;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    await renderRoot();

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(PENDING_DEVICE_SETUP_ROUTE);
  });

  it('falls back to the default protected route when stale state requests the hidden lesson prototype', async () => {
    mockAuthState.isAuthenticated = true;
    mockHouseholdState.onboardingComplete = true;
    mockHouseholdState.protectedInitialRoute = ROUTES.LessonReadyScreen;
    mockHouseholdState.activeHousehold = { id: 'household-1' };
    mockHouseholdState.children = [{ id: 'child-1' }];

    await renderRoot();

    expect((await screen.findByTestId('protected-stack')).props.children).toBe(ROUTES.HomeHubScreen);
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

    await renderRoot(<RootStackNavigator pendingDeepLinkTarget={target} />);

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
