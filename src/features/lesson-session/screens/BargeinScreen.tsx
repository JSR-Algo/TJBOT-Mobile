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

type Props = NativeStackScreenProps<RootStackParamList, 'BargeinScreen'>;

export default function BargeinScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8F4FF">
      <LessonHeader progress={0.3} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="800" style={styles.goAhead}>Oh — go ahead!</Text>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          <PulseRing size={260} color="#6FC1FF" />
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <Robot emotion="listen" size={200} accent="#6FC1FF" />
          </Box>
        </Box>
        <Text fontWeight="700" style={styles.listeningText}>I'm listening 👂</Text>
      </Box>
      <Box style={styles.footer} alignItems="center">
        <MicButton on onClick={() => navigation.navigate('ThinkingScreen')} />
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 240 },
  goAhead: { fontSize: 30, color: '#6FC1FF', marginBottom: 18 },
  pulseWrap: { width: 280, height: 280 },
  listeningText: { fontSize: 16, color: 'rgba(0,0,0,0.5)', marginTop: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 60 },
});
