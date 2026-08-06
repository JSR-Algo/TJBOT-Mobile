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
import { clearRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import {
  getCurrentAssignment,
  type CurrentAssignment,
} from '@/services/api/course-library.api';
import { captureError } from '@/services/observability/sentry';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonResumeScreen'>;

type VerificationState =
  | { readonly kind: 'checking' }
  | { readonly kind: 'ready'; readonly assignment: CurrentAssignment }
  | { readonly kind: 'ended' }
  | { readonly kind: 'error' };

const LIVE_ASSIGNMENT_STATES: ReadonlySet<CurrentAssignment['state']> = new Set([
  'ASSIGNED',
  'PRELOADING',
  'READY',
  'RUNNING',
  'PAUSED',
]);

export default function LessonResumeScreen({ navigation, route }: Props) {
  const decision = React.useMemo(
    () => decideLessonRecovery(route.params?.checkpoint),
    [route.params?.checkpoint],
  );
  const checkpoint = decision.kind === 'resume' ? decision.checkpoint : null;
  const checkpointKey = checkpoint
    ? JSON.stringify([checkpoint.deviceId, checkpoint.assignmentId, checkpoint.sessionId ?? null])
    : null;
  const [verification, setVerification] = React.useState<VerificationState>({ kind: 'checking' });
  const [retryNonce, setRetryNonce] = React.useState(0);
  const didResume = React.useRef(false);
  const validationGeneration = React.useRef(0);
  const activeValidation = React.useRef<{ readonly generation: number; readonly checkpointKey: string } | null>(null);
  const retryRequested = React.useRef(false);

  React.useEffect(() => {
    if (decision.kind !== 'ended') return;
    void clearRecoveryCheckpoint().catch(captureError);
  }, [decision.kind]);

  React.useEffect(() => {
    const generation = validationGeneration.current + 1;
    validationGeneration.current = generation;
    if (!checkpoint || !checkpointKey) {
      activeValidation.current = null;
      return;
    }
    let active = true;
    activeValidation.current = { generation, checkpointKey };
    retryRequested.current = false;
    setVerification({ kind: 'checking' });

    void getCurrentAssignment(checkpoint.deviceId).then(
      (current) => {
        if (!active || validationGeneration.current !== generation) return;
        const match = classifyLiveAssignment(checkpoint.assignmentId, checkpoint.sessionId, current);
        if (match.kind === 'ready') {
          setVerification({ kind: 'ready', assignment: match.assignment });
          return;
        }
        if (match.kind === 'unconfirmed') {
          setVerification({ kind: 'error' });
          return;
        }
        setVerification({ kind: 'ended' });
        void clearRecoveryCheckpoint().catch(captureError);
      },
      (error) => {
        if (!active || validationGeneration.current !== generation) return;
        activeValidation.current = null;
        captureError(error);
        setVerification({ kind: 'error' });
      },
    ).finally(() => {
      if (activeValidation.current?.generation === generation) {
        activeValidation.current = null;
      }
    });

    return () => {
      active = false;
    };
  }, [checkpoint, checkpointKey, retryNonce]);

  const retryVerification = (): void => {
    if (
      !checkpointKey ||
      retryRequested.current ||
      activeValidation.current?.checkpointKey === checkpointKey
    ) return;
    retryRequested.current = true;
    setVerification({ kind: 'checking' });
    setRetryNonce((value) => value + 1);
  };

  if (decision.kind === 'reauth') {
    return (
      <ScreenShell bg="#FFF4E3">
        <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
        <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
          <Robot emotion="worry" size={220} accent="#FFB85C" />
          <SpeechBubble>Session expired{`\n`}Please return home.</SpeechBubble>
          <Text style={styles.safeText}>Your lesson cannot continue until the session is refreshed.</Text>
        </Box>
        <Box style={styles.cta}>
          <PrimaryCTA color="#FF6F61" onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}>Back home</PrimaryCTA>
        </Box>
      </ScreenShell>
    );
  }

  if (decision.kind === 'ended' || verification.kind === 'ended') {
    return renderEnded(navigation);
  }

  if (verification.kind === 'checking') {
    return (
      <ScreenShell bg="#FFF4E3">
        <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
        <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
          <Robot emotion="idle" size={220} accent="#FFB85C" />
          <SpeechBubble>Checking your lesson...</SpeechBubble>
          <Text style={styles.safeText}>We are making sure this lesson is still ready on your robot.</Text>
        </Box>
      </ScreenShell>
    );
  }

  if (verification.kind === 'error') {
    return (
      <ScreenShell bg="#FFF4E3">
        <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
        <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
          <Robot emotion="worry" size={220} accent="#FFB85C" />
          <SpeechBubble>We can't confirm this lesson yet</SpeechBubble>
          <Text style={styles.safeText}>Check your connection, then try again.</Text>
        </Box>
        <Box style={styles.cta}>
          <PrimaryCTA color="#FF6F61" onPress={retryVerification}>Try again</PrimaryCTA>
        </Box>
      </ScreenShell>
    );
  }

  const resumableCheckpoint = decision.checkpoint;
  const assignment = verification.assignment;
  const lessonTitle = resumableCheckpoint.lessonTitle;
  const progressLabel = resumableCheckpoint.progressLabel;
  const progressPercent = parseProgressPercent(progressLabel);
  const activityLabel = resumableCheckpoint.activityLabel;
  const resumeLesson = (): void => {
    if (didResume.current) return;
    didResume.current = true;
    const sessionId = assignment.sessionId ?? resumableCheckpoint.sessionId;
    navigation.navigate(ROUTES.RunningScreen, {
      deviceId: resumableCheckpoint.deviceId,
      assignmentId: assignment.assignmentId,
      ...(sessionId ? { sessionId } : {}),
      childId: assignment.childId,
      lessonTitle: assignment.lessonTitle,
      ...(resumableCheckpoint.courseId ? { courseId: resumableCheckpoint.courseId } : {}),
    });
  };

  return (
    <ScreenShell bg="#C5F1DD">
      <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="happy" size={220} accent="#6CE2B6" />
        <SpeechBubble>Welcome back!{`\n`}Want to keep going?</SpeechBubble>
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
        <TouchableOpacity
          accessibilityLabel="Stop for now"
          accessibilityRole="button"
          onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
          activeOpacity={0.7}
        >
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Stop for now</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

function renderEnded(navigation: Props['navigation']): React.ReactElement {
  return (
    <ScreenShell bg="#E8E5F0">
      <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="idle" size={220} accent="#6B4A9B" />
        <SpeechBubble>Lesson ended{`\n`}You can start another activity from home.</SpeechBubble>
        <Text style={styles.safeText}>This lesson cannot be resumed from the saved checkpoint.</Text>
      </Box>
      <Box style={styles.cta}>
        <PrimaryCTA color="#6B4A9B" onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}>Back home</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

function classifyLiveAssignment(
  assignmentId: string,
  checkpointSessionId: string | undefined,
  current: CurrentAssignment | null,
):
  | { readonly kind: 'ready'; readonly assignment: CurrentAssignment }
  | { readonly kind: 'ended' }
  | { readonly kind: 'unconfirmed' } {
  if (!current || !LIVE_ASSIGNMENT_STATES.has(current.state) || current.assignmentId !== assignmentId) {
    return { kind: 'ended' };
  }
  if (!checkpointSessionId) {
    return { kind: 'ready', assignment: current };
  }
  if (!current.sessionId) {
    return { kind: 'unconfirmed' };
  }
  return checkpointSessionId === current.sessionId
    ? { kind: 'ready', assignment: current }
    : { kind: 'ended' };
}

function parseProgressPercent(label: string): number {
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
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
