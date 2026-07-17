import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import {
  clearActiveNestLesson,
  getActiveNestLesson,
} from '../nestPhoneLesson';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDoneScreen'>;

export default function LessonDoneScreen({ navigation }: Props) {
  const nestLesson = getActiveNestLesson();
  const wordCount = nestLesson?.session.session_payload?.core_learning?.length ?? 3;
  const reward = nestLesson?.session.session_payload?.reward?.message
    ?? `You learned ${wordCount} words today.\nSee you tomorrow! 👋`;

  React.useEffect(() => {
    // Context is kept only for this screen's summary copy; clear on leave so
    // the next Nest lesson bootstraps a fresh session/today payload.
    return () => {
      clearActiveNestLesson();
    };
  }, []);
  return (
    <ScreenShell bg="#FFF8E1">
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={14}>
        <Text fontWeight="800" style={styles.title}>You did it!</Text>
        <Robot emotion="success" size={240} accent="#FF6F61" />
        <Box flexDirection="row" gap={8}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={{ fontSize: 48 }}>⭐</Text>
          ))}
        </Box>
        <Box style={styles.summaryCard}>
          <Text fontWeight="700" style={styles.summaryText}>{reward}</Text>
        </Box>
      </Box>
      <Box style={styles.footer} gap={12}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.LessonSummaryScreen)} color="#FF6F61">See what you did</PrimaryCTA>
        <TouchableOpacity
          testID="lessonDoneHomeButton"
          onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
        >
          <Text fontWeight="700" style={styles.homeText}>Back home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, paddingHorizontal: 24, paddingBottom: 200 },
  title: { fontSize: 48, color: '#1A1A1F', textAlign: 'center', lineHeight: 52 },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.7)', padding: 18, borderRadius: 20, maxWidth: 300 },
  summaryText: { fontSize: 18, color: '#1A1A1F', textAlign: 'center', lineHeight: 26 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  homeText: { fontSize: 16, color: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: 8 },
});
