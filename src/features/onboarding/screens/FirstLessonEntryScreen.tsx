import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import OnboardingClayRobot from '../components/OnboardingClayRobot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { legacyNavigate } from '../legacyNavigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FirstLessonEntryScreen'>;

export default function FirstLessonEntryScreen(_props: Props) {
  const household = useOptionalHousehold();
  const handleStart = () => {
    if (household) {
      household.completeOnboarding(ROUTES.LessonReadyScreen);
      return;
    }
    legacyNavigate(_props.navigation, ROUTES.LessonReadyScreen);
  };

  return (
    <ScreenShell bg="#FFF8E1">
      <Box style={styles.parentPill} flexDirection="row" alignItems="center" gap={8}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <Path d="M7 11V8a4 4 0 118 0v3M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" />
        </Svg>
        <Text fontWeight="700" style={styles.parentText}>Hand the phone to your child</Text>
      </Box>
      <Box style={styles.hero} alignItems="center">
        <OnboardingClayRobot size={190} showRing />
        <SpeechBubble>Hi there!{'\n'}Want to play?</SpeechBubble>
        <Box style={styles.timePill}>
          <Text fontWeight="700" style={styles.timePillText}>⏱ About 3 minutes · headphones</Text>
        </Box>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={handleStart} color="#FF6F61">Yes!</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  parentPill: { position: 'absolute', top: 64, alignSelf: 'center', zIndex: 5, backgroundColor: 'rgba(255,255,255,0.85)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  parentText: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 140, paddingHorizontal: 28, paddingBottom: 230, gap: 12 },
  timePill: { backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  timePillText: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
