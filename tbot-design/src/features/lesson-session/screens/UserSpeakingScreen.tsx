import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PulseRing from '@/design-system/components/PulseRing';
import WaveBars from '@/design-system/components/WaveBars';
import MicButton from '@/components/MicButton';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'UserSpeakingScreen'>;

export default function UserSpeakingScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8F8F0">
      <LessonHeader progress={0.32} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="800" style={styles.iHearYou}>I hear you!</Text>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          <PulseRing size={260} color="#7BD389" />
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <Robot emotion="listen" size={200} accent="#7BD389" />
          </Box>
        </Box>
        <Box style={{ marginTop: 24 }}>
          <WaveBars color="#7BD389" height={56} count={18} />
        </Box>
      </Box>
      <Box style={styles.footer} alignItems="center" gap={14}>
        <MicButton on onClick={() => navigation.navigate('ThinkingScreen')} label="stop" />
        <Text fontWeight="700" style={styles.tapText}>Tap when done</Text>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 240 },
  iHearYou: { fontSize: 30, color: '#7BD389', marginBottom: 18 },
  pulseWrap: { width: 280, height: 280 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 60 },
  tapText: { fontSize: 15, color: 'rgba(0,0,0,0.5)' },
});
