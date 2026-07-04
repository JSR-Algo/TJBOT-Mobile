import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import PulseRing from '@/design-system/components/PulseRing';
import { referenceColors } from '@/design-system/referenceTheme';
import OnboardingClayRobot from '@/features/onboarding/components/OnboardingClayRobot';
import IntroFrame from '../components/IntroFrame';
import { Box } from '@/design-system/primitives/Box';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroListenScreen'>;

export default function IntroListenScreen({ navigation }: Props) {
  return (
    <IntroFrame
      idx={0}
      onBack={() => navigation.navigate(ROUTES.WelcomeScreen)}
      onNext={() => navigation.navigate(ROUTES.IntroSpeakScreen)}
      bg="#E8F4FF"
      kicker="How it works · 1"
      title="Robot listens"
      body="Kids tap the mic and speak. Robot listens patiently — no reading, no typing."
      illo={(
        <Box style={styles.illoWrap} alignItems="center" justifyContent="center">
          <PulseRing size={200} color={referenceColors.primary} />
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <OnboardingClayRobot size={150} />
          </Box>
        </Box>
      )}
    />
  );
}

const styles = StyleSheet.create({
  illoWrap: { width: 240, height: 200 },
});
