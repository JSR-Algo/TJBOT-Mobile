import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { colors } from '@/design-system/tokens/legacy-semantic';
import AgeScreen from '@/navigation/AgeScreen';
import { readAgeAnswer, roleForAgeBand, type AgeAnswer } from '@/features/onboarding/ageGate';
import { AuthNavigator } from './AuthNavigator';
import { PENDING_DEVICE_SETUP_ROUTE, PROTECTED_DEFAULT_ROUTE } from './featureRegistry';
import { ModalNavigator } from './ModalNavigator';
import type { NavigationDeepLinkTarget } from './linking';
import { OnboardingNavigator } from './OnboardingNavigator';

type Props = {
  pendingDeepLinkTarget?: NavigationDeepLinkTarget | null;
};

type AgeGateState =
  | { status: 'loading' }
  | { status: 'needed' }
  | { status: 'answered'; answer: AgeAnswer };

export function RootStackNavigator({ pendingDeepLinkTarget = null }: Props): React.JSX.Element {
  const investorDemo = isInvestorDemoEnabled();
  const { isAuthenticated, isLoading } = useAuth();
  const {
    isLoading: householdLoading,
    onboardingComplete,
    pendingDeviceSetup,
    protectedInitialRoute = PROTECTED_DEFAULT_ROUTE,
  } = useHousehold();
  const [ageGate, setAgeGate] = React.useState<AgeGateState>(
    investorDemo
      ? {
          status: 'answered',
          answer: {
            band: '18_PLUS',
            role: roleForAgeBand('18_PLUS'),
            answeredAt: '2026-06-20T00:00:00.000Z',
          },
        }
      : { status: 'loading' },
  );

  React.useEffect(() => {
    if (investorDemo) return undefined;
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
  }, [investorDemo]);

  if (investorDemo) {
    const initialTarget: NavigationDeepLinkTarget = pendingDeepLinkTarget ?? {
      name: PROTECTED_DEFAULT_ROUTE,
    };
    return (
      <ModalNavigator
        key="protected-investor-demo"
        initialRouteName={initialTarget.name}
        initialRouteParams={initialTarget.params}
      />
    );
  }

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
