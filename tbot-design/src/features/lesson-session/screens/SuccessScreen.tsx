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
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'SuccessScreen'>;

export default function SuccessScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8F8F0">
      <LessonHeader progress={0.45} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="success" size={240} accent="#E8A33C" />
        <SpeechBubble color="#fff">
          <Text style={{ color: '#7BD389' }}>Nice speaking!</Text>{'\n'}
          <Text style={styles.saidText}>You said "cat" 🐱</Text>
        </SpeechBubble>
        <Box flexDirection="row" gap={6}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={{ fontSize: 32 }}>⭐</Text>
          ))}
        </Box>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate('RobotSpeakingScreen')} color="#7BD389">Next →</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  saidText: { fontSize: 18, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
