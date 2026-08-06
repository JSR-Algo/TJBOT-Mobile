import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { ROUTES } from '@/navigation/routes';
import { useLessonHardwareBack } from '../hooks/useLessonHardwareBack';

type Props = NativeStackScreenProps<RootStackParamList, 'OfftopicScreen'>;

export default function OfftopicScreen({ navigation }: Props) {
  // Lesson is still live on this screen: Android hardware-back must
  // funnel through ExitConfirm, never pop the stack (MOB-2).
  useLessonHardwareBack(navigation, 'INTERRUPTED_OFFTOPIC');
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="happy" size={220} />
        <SpeechBubble>Oh fun! 🐱{'\n'}Let's stay with the cat for now.</SpeechBubble>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.RobotListeningScreen)} color="#7BD389">Back to the cat</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
