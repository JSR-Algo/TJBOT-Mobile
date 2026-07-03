import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
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
      household.completeOnboarding(ROUTES.SendToRobotScreen);
      return;
    }
    legacyNavigate(_props.navigation, ROUTES.SendToRobotScreen);
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
        <Robot emotion="greet" size={142} accent="#FF6F61" />
        <SpeechBubble>Hi there!{'\n'}Want to play?</SpeechBubble>
        <StarterLessonPreview />
        <Box style={styles.timePill}>
          <Text fontWeight="700" style={styles.timePillText}>About 3 minutes · headphones if you have them</Text>
        </Box>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={handleStart} color="#FF6F61">Yes!</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

function StarterLessonPreview() {
  return (
    <Box
      accessible
      accessibilityRole="image"
      accessibilityLabel="Starter lesson preview with Robot and hello word cards"
      style={styles.previewCard}
    >
      <Svg width="100%" height={96} viewBox="0 0 288 96">
        <Rect x="0" y="0" width="288" height="96" rx="8" fill="#FFFFFF" />
        <Rect x="14" y="14" width="92" height="68" rx="8" fill="#DDF5EE" />
        <Circle cx="60" cy="42" r="22" fill="#8FE3C0" />
        <Rect x="38" y="36" width="44" height="32" rx="14" fill="#FFFFFF" />
        <Circle cx="52" cy="50" r="4" fill="#1A1A1F" />
        <Circle cx="68" cy="50" r="4" fill="#1A1A1F" />
        <Path d="M52 60 Q60 66 68 60" stroke="#1A1A1F" strokeWidth="3" fill="none" strokeLinecap="round" />
        <Rect x="124" y="18" width="62" height="28" rx="8" fill="#FFEEE5" />
        <Path d="M139 33 H171" stroke="#FF6F61" strokeWidth="4" strokeLinecap="round" />
        <Rect x="196" y="18" width="58" height="28" rx="8" fill="#EEF1F5" />
        <Path d="M211 33 H239" stroke="#7A8794" strokeWidth="4" strokeLinecap="round" />
        <Rect x="124" y="56" width="130" height="18" rx="8" fill="#FFF8E1" />
        <Path d="M140 65 H238" stroke="#FFC857" strokeWidth="4" strokeLinecap="round" />
      </Svg>
      <Box style={styles.previewCopy}>
        <Text fontWeight="700" style={styles.previewKicker}>Starter lesson</Text>
        <Text fontWeight="800" style={styles.previewTitle}>Hello Friends</Text>
        <Text style={styles.previewBody}>Say hello to Panda</Text>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  parentPill: { position: 'absolute', top: 64, alignSelf: 'center', zIndex: 5, backgroundColor: 'rgba(255,255,255,0.85)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  parentText: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 118, paddingHorizontal: 28, paddingBottom: 150, gap: 9 },
  previewCard: {
    width: '100%',
    maxWidth: 288,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  previewCopy: { paddingHorizontal: 6, paddingTop: 4, paddingBottom: 2 },
  previewKicker: { fontSize: 11, color: '#FF6F61', textTransform: 'uppercase', letterSpacing: 0.6 },
  previewTitle: { fontSize: 18, color: '#1A1A1F', marginTop: 2 },
  previewBody: { fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 2 },
  timePill: { backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  timePillText: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
