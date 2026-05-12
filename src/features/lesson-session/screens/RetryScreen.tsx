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

type Props = NativeStackScreenProps<RootStackParamList, 'RetryScreen'>;

export default function RetryScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="curious" size={220} accent="#E8A33C" />
        <SpeechBubble>I heard you trying.{'\n'}One more time?</SpeechBubble>
        <Text fontWeight="700" style={styles.prompt}>Say: <Text fontWeight="700" style={{ color: '#1A1A1F' }}>"cat"</Text></Text>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate('RobotListeningScreen')} color="#FF6F61">I'll try!</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  prompt: { fontSize: 18, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
