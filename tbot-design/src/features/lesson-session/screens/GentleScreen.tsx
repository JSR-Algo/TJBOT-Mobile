import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'GentleScreen'>;

export default function GentleScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#F5F5F2">
      <LessonHeader progress={0.34} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="gentle" size={220} accent="#E8A33C" />
        <SpeechBubble>Let's try that together.{'\n'}"cat" 🐱</SpeechBubble>
      </Box>
      <Box style={styles.footer} gap={12}>
        <PrimaryCTA onPress={() => navigation.navigate('RobotListeningScreen')} color="#FF6F61">Try again</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('RobotSpeakingScreen')}>
          <Text fontWeight="700" style={styles.hearAgainText}>Hear it again</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  hearAgainText: { fontSize: 16, color: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: 8 },
});
