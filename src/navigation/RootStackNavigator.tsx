import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { colors } from '@/design-system/tokens/legacy-semantic';
import { readRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import type { LessonCheckpoint } from '@/features/fallback/recoveryTypes';
import AgeScreen from '@/navigation/AgeScreen';
import { readAgeAnswer, type AgeAnswer } from '@/features/onboarding/ageGate';
import { captureError } from '@/services/observability/sentry';
import { AuthNavigator } from './AuthNavigator';
import { PENDING_DEVICE_SETUP_ROUTE, PROTECTED_DEFAULT_ROUTE, isProductionNavigableRoute } from './featureRegistry';
import { ModalNavigator } from './ModalNavigator';
import type { NavigationDeepLinkTarget } from './linking';
import { OnboardingNavigator } from './OnboardingNavigator';
import { ROUTES } from './routes';

const RECOVERY_BOOTSTRAP_TIMEOUT_MS = 5_000;

type Props = {
  pendingDeepLinkTarget?: NavigationDeepLinkTarget | null;
};

type AgeGateState =
  | { status: 'loading' }
  | { status: 'needed' }
  | { status: 'answered'; answer: AgeAnswer };

type RecoveryCheckpointState =
  | { status: 'loading' }
  | { status: 'loaded'; checkpoint: LessonCheckpoint | null };

export function RootStackNavigator({ pendingDeepLinkTarget = null }: Props): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const {
    isLoading: householdLoading,
    onboardingComplete,
    pendingDeviceSetup,
    protectedInitialRoute = PROTECTED_DEFAULT_ROUTE,
  } = useHousehold();
  const [ageGate, setAgeGate] = React.useState<AgeGateState>({ status: 'loading' });
  const [recoveryCheckpoint, setRecoveryCheckpoint] = React.useState<RecoveryCheckpointState>({ status: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    readAgeAnswer().then(
      (answer) => {
        if (cancelled) return;
        if (answer) setAgeGate({ status: 'answered', answer });
        else setAgeGate({ status: 'needed' });
      },
      () => {
        if (!cancelled) setAgeGate({ status: 'needed' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (cancelled || settled) return;
      settled = true;
      captureError(new Error(`Recovery checkpoint bootstrap timed out after ${RECOVERY_BOOTSTRAP_TIMEOUT_MS}ms`));
      setRecoveryCheckpoint({ status: 'loaded', checkpoint: null });
    }, RECOVERY_BOOTSTRAP_TIMEOUT_MS);

    readRecoveryCheckpoint().then(
      (checkpoint) => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(timeout);
        setRecoveryCheckpoint({ status: 'loaded', checkpoint });
      },
      (error: unknown) => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(timeout);
        captureError(error);
        setRecoveryCheckpoint({ status: 'loaded', checkpoint: null });
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  if (
    ageGate.status === 'loading' ||
    recoveryCheckpoint.status === 'loading' ||
    isLoading ||
    (isAuthenticated && householdLoading)
  ) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (ageGate.status === 'needed') {
    return (
      <AgeScreen
        key="age-gate"
        onComplete={(answer) => setAgeGate({ status: 'answered', answer })}
      />
    );
  }

  if (!isAuthenticated) return <AuthNavigator key="auth" />;
  if (!onboardingComplete) return <OnboardingNavigator key="onboarding" />;

  const requestedInitialRoute = pendingDeviceSetup ? PENDING_DEVICE_SETUP_ROUTE : protectedInitialRoute;
  const productionInitialRoute = isProductionNavigableRoute(requestedInitialRoute)
    ? requestedInitialRoute
    : PROTECTED_DEFAULT_ROUTE;
  const authenticatedRecoveryCheckpoint: LessonCheckpoint | null = recoveryCheckpoint.checkpoint
    ? { ...recoveryCheckpoint.checkpoint, authState: 'authenticated' }
    : null;
  let initialTarget: NavigationDeepLinkTarget;
  if (pendingDeepLinkTarget && isProductionNavigableRoute(pendingDeepLinkTarget.name)) {
    initialTarget = pendingDeepLinkTarget;
  } else if (!pendingDeviceSetup && authenticatedRecoveryCheckpoint) {
    initialTarget = {
      name: ROUTES.LessonResumeScreen,
      params: { checkpoint: authenticatedRecoveryCheckpoint },
    };
  } else {
    initialTarget = { name: productionInitialRoute };
  }

  return <ModalNavigator key="protected" initialRouteName={initialTarget.name} initialRouteParams={initialTarget.params} />;
}
