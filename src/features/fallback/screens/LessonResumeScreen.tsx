import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { decideLessonRecovery } from '@/features/fallback/recoveryTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonResumeScreen'>;

export default function LessonResumeScreen({ navigation, route }: Props) {
  const decision = decideLessonRecovery(route.params?.checkpoint);
  const didResume = React.useRef(false);

  if (decision.kind === 'reauth') {
    return (
      <ScreenShell bg="#FFF4E3">
        <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
        <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
          <Robot emotion="worry" size={220} accent="#FFB85C" />
          <SpeechBubble>Session expired{'\n'}Please sign in again.</SpeechBubble>
          <Text style={styles.safeText}>Your lesson place is saved after you sign in.</Text>
        </Box>
        <Box style={styles.cta} gap={10}>
          <PrimaryCTA color="#FF6F61" onPress={() => navigation.navigate(ROUTES.LoginScreen)}>Sign in again</PrimaryCTA>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} activeOpacity={0.7}>
            <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Back home</Text>
          </TouchableOpacity>
        </Box>
      </ScreenShell>
    );
  }

  if (decision.kind === 'ended') {
    return (
      <ScreenShell bg="#E8E5F0">
        <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
        <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
          <Robot emotion="idle" size={220} accent="#6B4A9B" />
          <SpeechBubble>Lesson ended{'\n'}You can start another activity from home.</SpeechBubble>
          <Text style={styles.safeText}>This lesson cannot be resumed from the saved checkpoint.</Text>
        </Box>
        <Box style={styles.cta}>
          <PrimaryCTA color="#6B4A9B" onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}>Back home</PrimaryCTA>
        </Box>
      </ScreenShell>
    );
  }

  const checkpoint = decision.checkpoint;
  const lessonTitle = checkpoint.lessonTitle;
  const progressLabel = checkpoint.progressLabel;
  // Drive the bar width off the same label the text shows, so a data-bound
  // "40%" label no longer sits over a hardcoded 60% fill. Clamp to 0–100;
  // fall back to 0 when the label has no parseable percentage.
  const progressPercent = parseProgressPercent(progressLabel);
  const activityLabel = checkpoint?.activityLabel;
  const resumeLesson = (): void => {
    if (didResume.current) return;
    didResume.current = true;

    if (checkpoint.resumeTarget === ROUTES.HomeHubScreen) {
      navigation.navigate(ROUTES.HomeHubScreen);
      return;
    }
    if (hasCourseResumeContext(checkpoint)) {
      navigation.navigate(ROUTES.SendToRobotScreen, {
        courseId: checkpoint.courseId,
        resumeContext: {
          courseId: checkpoint.courseId,
          childId: checkpoint.childId,
          deviceId: checkpoint.deviceId,
          assignmentId: checkpoint.assignmentId,
          assignmentVersion: checkpoint.assignmentVersion,
          lessonTitle: checkpoint.lessonTitle,
          manifestChecksum: checkpoint.manifestChecksum,
        },
      });
      return;
    }
    navigation.navigate(ROUTES.SendToRobotScreen);
  };
  return (
    <ScreenShell bg="#C5F1DD">
      <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="happy" size={220} accent="#6CE2B6" />
        <SpeechBubble>Welcome back!{'\n'}Want to keep going?</SpeechBubble>
        <Box style={styles.card} flexDirection="row" alignItems="center" gap={14}>
          <Box style={styles.bookIcon}>
            <Text style={{ fontSize: 28 }}>📖</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="700" style={styles.whereLabel}>WHERE WE STOPPED</Text>
            <Text fontWeight="800" style={styles.lessonTitle}>{lessonTitle}</Text>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
            {activityLabel ? <Text style={styles.progressLabel}>{activityLabel}</Text> : null}
            <Box style={styles.progressTrack} marginTop={6}>
              <Box style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#FF6F61" onPress={resumeLesson}>Keep going</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Stop for now</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

// Pull the leading numeric percent out of a label like "40%" / "Step 2 · 75%".
// Returns 0 when nothing parseable is present so the bar collapses rather than
// lying about progress; clamps to the 0–100 range.
function parseProgressPercent(label: string): number {
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function hasCourseResumeContext(checkpoint: unknown): checkpoint is {
  courseId: string;
  childId: string;
  deviceId?: string;
  assignmentId?: string;
  assignmentVersion?: number;
  lessonTitle?: string;
  manifestChecksum?: string | null;
} {
  return Boolean(
    checkpoint &&
      typeof checkpoint === 'object' &&
      typeof (checkpoint as { courseId?: unknown }).courseId === 'string' &&
      Boolean((checkpoint as { courseId: string }).courseId) &&
      typeof (checkpoint as { childId?: unknown }).childId === 'string' &&
      Boolean((checkpoint as { childId: string }).childId),
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 90, paddingBottom: 240, paddingHorizontal: 24, gap: 18 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, width: '90%' },
  bookIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#FFB3A8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  whereLabel: { fontSize: 11, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1 },
  lessonTitle: { fontSize: 18, color: '#2B2140' },
  progressLabel: { fontSize: 13, color: '#5C4F77', marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6CE2B6', borderRadius: 3 },
  safeText: { color: '#5C4F77', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
