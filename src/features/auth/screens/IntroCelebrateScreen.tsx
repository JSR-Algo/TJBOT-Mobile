import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import IntroFrame from '../components/IntroFrame';
import OnboardingClayRobot from '@/features/onboarding/components/OnboardingClayRobot';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroCelebrateScreen'>;

export default function IntroCelebrateScreen({ navigation }: Props) {
  return (
    <IntroFrame
      idx={3}
      onBack={() => navigation.navigate(ROUTES.IntroRetryScreen)}
      onNext={() => navigation.navigate(ROUTES.TrustScreen)}
      bg="#FFF8E1"
      kicker="How it works · 4"
      title="Small wins, every day"
      body="Each lesson is short and ends with a celebration. Built for 3–5 minutes a day."
      illo={(
        <Box style={styles.illoWrap} alignItems="center" justifyContent="center" gap={8}>
          <OnboardingClayRobot size={160} showRing />
          <Text fontWeight="700" style={styles.sparkle}>🎉</Text>
        </Box>
      )}
    />
  );
}

const styles = StyleSheet.create({
  illoWrap: { width: 240, height: 200 },
  sparkle: { fontSize: 28, color: referenceColors.gold },
});
