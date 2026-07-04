import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import OnboardingClayRobot from '@/features/onboarding/components/OnboardingClayRobot';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenShell bg={referenceColors.bg} testID="welcomeScreen">
      <Box style={styles.content} alignItems="center">
        <OnboardingClayRobot size={190} showRing testID="welcome-clay-robot" />
        <Text fontWeight="800" style={styles.heroTitle}>Hi! I'm Robot.{'\n'}I help kids talk in English.</Text>
        <Box style={styles.parentNote} flexDirection="row" alignItems="center" gap={10}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <Circle cx="12" cy="8" r="4" />
            <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </Svg>
          <Text fontWeight="600" style={styles.parentText}>A grown-up sets things up the first time.</Text>
        </Box>
      </Box>
      <Box style={styles.footer} gap={10}>
        <PrimaryCTA
          onPress={() => navigation.navigate(ROUTES.IntroListenScreen)}
          color={referenceColors.primary}
          testID="getStartedButton"
        >
          Get started
        </PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 94, paddingHorizontal: 28, paddingBottom: 230 },
  heroTitle: { fontSize: 32, color: referenceColors.ink, textAlign: 'center', marginTop: 12, lineHeight: 37, letterSpacing: 0 },
  parentNote: {
    marginTop: 22,
    backgroundColor: referenceColors.card,
    padding: 15,
    borderRadius: 22,
    maxWidth: 310,
    borderWidth: 1,
    borderColor: referenceColors.line,
    ...referenceShadow.card,
  },
  parentText: { fontSize: 13, color: referenceColors.inkSoft, flex: 1, lineHeight: 18 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
