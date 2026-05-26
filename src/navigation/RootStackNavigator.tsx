import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { colors } from '@/design-system/tokens/legacy-semantic';
import AgeScreen from '@/navigation/AgeScreen';
import { readAgeAnswer, type AgeAnswer } from '@/features/onboarding/ageGate';
import { AuthNavigator } from './AuthNavigator';
import { PENDING_DEVICE_SETUP_ROUTE, PROTECTED_DEFAULT_ROUTE } from './featureRegistry';
import { ModalNavigator } from './ModalNavigator';
import type { NavigationDeepLinkTarget } from './linking';
import { OnboardingNavigator } from './OnboardingNavigator';

type Props = {
  pendingDeepLinkTarget?: NavigationDeepLinkTarget | null;
  onDeepLinkRouteConsumed?: () => void;
};

type AgeGateState =
  | { status: 'loading' }
  | { status: 'needed' }
  | { status: 'answered'; answer: AgeAnswer };

export function RootStackNavigator({ pendingDeepLinkTarget = null, onDeepLinkRouteConsumed }: Props): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const {
    isLoading: householdLoading,
    onboardingComplete,
    pendingDeviceSetup,
    protectedInitialRoute = PROTECTED_DEFAULT_ROUTE,
  } = useHousehold();
  const [ageGate, setAgeGate] = React.useState<AgeGateState>({ status: 'loading' });
  const canShowProtected = isAuthenticated && onboardingComplete;

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
    if (canShowProtected && pendingDeepLinkTarget) {
      onDeepLinkRouteConsumed?.();
    }
  }, [canShowProtected, onDeepLinkRouteConsumed, pendingDeepLinkTarget]);

  if (ageGate.status === 'loading' || isLoading || (isAuthenticated && householdLoading)) {
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

  const initialTarget: NavigationDeepLinkTarget = pendingDeepLinkTarget ?? {
    name: pendingDeviceSetup ? PENDING_DEVICE_SETUP_ROUTE : protectedInitialRoute,
  };

  return <ModalNavigator key="protected" initialRouteName={initialTarget.name} initialRouteParams={initialTarget.params} />;
}
