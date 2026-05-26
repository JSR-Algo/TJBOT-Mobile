import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'AudioErrorScreen'>;

export default function AudioErrorScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#FDECEA">
      <LessonHeader progress={0.34} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="sad" size={220} accent="#FF6F61" />
        <SpeechBubble>I can't hear my microphone.{'\n'}Let's check it together.</SpeechBubble>
        <Box style={styles.helpCard} flexDirection="row" alignItems="center" gap={12}>
          <Text style={{ fontSize: 28 }}>🎤</Text>
          <Text fontWeight="600" style={styles.helpText}>Ask a grown-up to turn the mic on.</Text>
        </Box>
      </Box>
      <Box style={styles.footer} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.RobotListeningScreen)} color="#FF6F61">Try again</PrimaryCTA>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
          accessibilityRole="button"
          accessibilityLabel="Go home"
        >
          <Text fontWeight="700" style={styles.homeText}>Go home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 220 },
  helpCard: { backgroundColor: '#fff', padding: 16, borderRadius: 18, maxWidth: 300, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  helpText: { fontSize: 14, color: 'rgba(0,0,0,0.5)', flex: 1 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  homeText: { fontSize: 16, color: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: 8 },
});
