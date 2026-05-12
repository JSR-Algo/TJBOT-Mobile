import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';

type Props = NativeStackScreenProps<RootStackParamList, 'OfftopicScreen'>;

export default function OfftopicScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="happy" size={220} />
        <SpeechBubble>Oh fun! 🐱{'\n'}Let's stay with the cat for now.</SpeechBubble>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate('RobotListeningScreen')} color="#7BD389">Back to the cat</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
