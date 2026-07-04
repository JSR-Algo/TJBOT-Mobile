import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import WaveBars from '@/design-system/components/WaveBars';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useLessonHardwareBack } from '../hooks/useLessonHardwareBack';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotSpeakingScreen'>;

export default function RobotSpeakingScreen({ navigation }: Props) {
  // Android hardware-back during this active voice turn must funnel through
  // ExitConfirm, not silently pop the stack (MOB-2).
  useLessonHardwareBack(navigation, 'ASSISTANT_SPEAKING');
  return (
    <ScreenShell>
      <Box accessible accessibilityLabel="Robot is speaking" flex={1}>
      <LessonHeader progress={0.25} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Text fontWeight="700" style={styles.listenLabel}>Listen 👂</Text>
        <RobotImage variant="head" size={140} />
        <SpeechBubble>This is a cat.{'\n'}🐱</SpeechBubble>
        <Box accessible accessibilityLabel="Robot voice waveform" style={{ marginTop: 8 }}>
          <WaveBars color="#6FC1FF" height={20} count={12} />
        </Box>
      </Box>
      <Box style={styles.footer}>
        <TouchableOpacity style={styles.waitBtn} onPress={() => navigation.navigate(ROUTES.RobotListeningScreen)}>
          <Text fontWeight="700" style={styles.waitText}>🤖 Robot is talking…</Text>
        </TouchableOpacity>
      </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 220 },
  listenLabel: { fontSize: 14, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 1.5 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  waitBtn: { width: '100%', minHeight: 60, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.15)', backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  waitText: { fontSize: 18, color: 'rgba(0,0,0,0.5)' },
});
