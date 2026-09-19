import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import { ROUTES } from '@/navigation/routes';
import { presentAssignmentState, type AssignmentState } from '@/services/api/course-library.api';
import { formatLessonCopy } from '@/utils/errors';
import { useAssignmentMonitor } from '../useAssignmentMonitor';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanionScreen'>;

function faceFor(state: AssignmentState | undefined): 'speak' | 'happy' | 'think' {
  if (state === 'COMPLETED') return 'happy';
  if (state === 'RUNNING') return 'speak';
  return 'think';
}

export default function CompanionScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const missingDeviceId = !deviceId;
  const { assignment, finished, unsuccessful: observerTerminalUnsuccessful,
    stale: assignmentStale, retry: retryCurrentAssignment } = useAssignmentMonitor(route.params ?? {});
  const sessionId = assignment?.sessionId;

  const terminalUnsuccessful = observerTerminalUnsuccessful || assignment?.state === 'FAILED' || assignment?.state === 'CANCELLED';
  const statusUnavailable = assignmentStale || missingDeviceId || terminalUnsuccessful;
  const completed = !statusUnavailable && (finished || assignment?.state === 'COMPLETED');
  const lessonTitle =
    assignment?.lessonTitle?.trim()
      ? assignment.lessonTitle
      : route.params?.lessonTitle?.trim()
        ? route.params.lessonTitle
        : "Today's lesson";
  const assignmentId = assignment?.assignmentId ?? route.params?.assignmentId;
  const presentation = completed
    ? presentAssignmentState('COMPLETED')
    : assignment
      ? presentAssignmentState(assignment.state)
      : null;
  const statusCopy = terminalUnsuccessful
    ? 'Robot could not finish this lesson.'
    : statusUnavailable
      ? "We can't confirm the live mirror yet."
    : presentation
      ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
      : 'Lesson running on Robot';

  return (
    <DeviceShell title="What Robot sees" onBack={() => navigation.goBack()}>
      <Text style={styles.intro}>
        A live mirror of Robot's face. <Text fontWeight="600" style={{ color: CL.ink }}>No transcript</Text> — what your child says stays between them.
      </Text>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.lcdMirror} alignItems="center" gap={12}>
          <Box flexDirection="row" alignItems="center" gap={10} style={styles.liveRow}>
            <Box style={[styles.liveDot, statusUnavailable && styles.liveDotStale]} />
            <Text style={styles.liveText}>{statusUnavailable ? 'Waiting' : 'Live'}</Text>
          </Box>
          <LCDFace emotion={completed ? 'happy' : statusUnavailable ? 'think' : faceFor(assignment?.state)} size={220} accent="#FF6F61" />
          <Text fontWeight="600" style={styles.phaseLabel}>{statusCopy}</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.progressCard}>
          <Text fontWeight="600" style={styles.progressTitle}>{lessonTitle}</Text>
          <Text style={styles.progressMeta}>
            {statusUnavailable ? 'Return to lesson status to reconnect Robot.' : 'Robot is leading the lesson. You can put your phone away.'}
          </Text>
        </Box>
      </Box>

      {assignmentStale && !missingDeviceId && (
        <Box paddingHorizontal={20} paddingTop={18} gap={10}>
          <DeviceBigBtn onClick={retryCurrentAssignment}>Try again</DeviceBigBtn>
          <DeviceBigBtn secondary onClick={() => navigation.goBack()}>
            Back to lesson status
          </DeviceBigBtn>
        </Box>
      )}

      {completed && assignmentId && deviceId && assignment?.lessonId ? (
        <Box paddingHorizontal={20} paddingTop={18}>
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.LessonSummaryScreen, {
            childId: assignment?.childId ?? route.params?.childId,
            assignmentId,
            deviceId,
            lessonId: assignment.lessonId,
            sessionId: sessionId ?? undefined,
          })}>
            See lesson reward
          </DeviceBigBtn>
        </Box>
      ) : null}

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>If you need to</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔉" title="Turn volume down" body="Currently at 6 of 10" />
          <DeviceRow icon="⏸️" title="Pause Robot gently" body="Robot will say 'Let's take a quick break'" />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  lcdMirror: { backgroundColor: '#0E1116', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 },
  liveRow: { alignSelf: 'flex-start' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF5454' },
  liveDotStale: { backgroundColor: '#98A2B3' },
  liveText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  phaseLabel: { fontSize: 15, color: '#fff', marginTop: 4, textAlign: 'center' },
  progressCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  progressTitle: { fontSize: 13, color: CL.ink },
  progressMeta: { fontSize: 11, color: CL.ink2, marginTop: 4, lineHeight: 16 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
