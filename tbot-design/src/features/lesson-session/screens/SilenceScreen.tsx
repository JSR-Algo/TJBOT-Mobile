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

type Props = NativeStackScreenProps<RootStackParamList, 'SilenceScreen'>;

export default function SilenceScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="curious" size={220} />
        <SpeechBubble>Hmm, I didn't hear that clearly.{'\n'}Let's try again.</SpeechBubble>
        <Box style={styles.louderPill} flexDirection="row" alignItems="center" gap={8}>
          <Text style={{ fontSize: 20 }}>🤫</Text>
          <Text fontWeight="700" style={styles.louderText}>Speak a little louder</Text>
        </Box>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate('RobotListeningScreen')} color="#FF6F61">I'm here!</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  louderPill: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  louderText: { fontSize: 14, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
