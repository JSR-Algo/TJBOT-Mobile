import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '@/design-system/tokens/legacy-semantic';
import { AuthStack } from './navigation/AuthStack';
import { OnboardingStack } from './navigation/OnboardingStack';
import { ModalStack } from './navigation/ModalStack';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthStack />;
  // TODO(PR4): gate on isOnboarded once onboarding state lands in AuthContext
  return <ModalStack />;
}
