import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonResumeScreen'>;

export default function LessonResumeScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#C5F1DD">
      <TopBar onBack={() => navigation.navigate('HomeHubScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="happy" size={220} accent="#6CE2B6" />
        <SpeechBubble>Welcome back!{'\n'}Want to keep going?</SpeechBubble>
        <Box style={styles.card} flexDirection="row" alignItems="center" gap={14}>
          <Box style={styles.bookIcon}>
            <Text style={{ fontSize: 28 }}>📖</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="700" style={styles.whereLabel}>WHERE WE STOPPED</Text>
            <Text fontWeight="800" style={styles.lessonTitle}>How are you?</Text>
            <Box style={styles.progressTrack} marginTop={6}>
              <Box style={styles.progressFill} />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#FF6F61" onPress={() => navigation.navigate('SpeakScreen')}>
          Keep going
        </PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('HomeHubScreen')} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Stop for now</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 90, paddingBottom: 240, paddingHorizontal: 24, gap: 18 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, width: '90%' },
  bookIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#FFB3A8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  whereLabel: { fontSize: 11, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1 },
  lessonTitle: { fontSize: 18, color: '#2B2140' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', width: '60%', backgroundColor: '#6CE2B6', borderRadius: 3 },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
