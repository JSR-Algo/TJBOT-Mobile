import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { AuthStack } from './AuthStack';
import { OnboardingStack } from './OnboardingStack';
import { MainStack } from './MainStack';
import { colors } from '../theme';

export function RootNavigator(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const { onboardingComplete, isLoading: householdsLoading } = useHousehold();

  if (isLoading || (isAuthenticated && householdsLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthStack />;
  if (!onboardingComplete) return <OnboardingStack />;
  return <MainStack />;
}
