import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PulseRing from '@/design-system/components/PulseRing';
import MicButton from '@/components/MicButton';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotListeningScreen'>;

export default function RobotListeningScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <LessonHeader progress={0.3} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="800" style={styles.yourTurn}>Your turn!</Text>
        <Text fontWeight="600" style={styles.prompt}>Say: <Text fontWeight="700" style={{ color: '#1A1A1F' }}>"cat"</Text> 🐱</Text>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          <PulseRing size={240} color="#FF6F61" />
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <Robot emotion="listen" size={200} />
          </Box>
        </Box>
      </Box>
      <Box style={styles.footer} alignItems="center" gap={14}>
        <MicButton on onClick={() => navigation.navigate('UserSpeakingScreen')} label="speak now" />
        <Text fontWeight="700" style={styles.listeningText}>I'm listening…</Text>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 240 },
  yourTurn: { fontSize: 30, color: '#FF6F61', marginBottom: 6 },
  prompt: { fontSize: 18, color: 'rgba(0,0,0,0.5)', marginBottom: 24 },
  pulseWrap: { width: 280, height: 280 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 60 },
  listeningText: { fontSize: 15, color: 'rgba(0,0,0,0.5)' },
});
