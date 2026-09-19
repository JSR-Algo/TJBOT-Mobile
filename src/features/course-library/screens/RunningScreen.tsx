import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import { ROUTES } from '@/navigation/routes';
import { presentAssignmentState } from '@/services/api/course-library.api';
import { formatLessonCopy } from '@/utils/errors';
import { useAssignmentMonitor } from '../useAssignmentMonitor';

type Props = NativeStackScreenProps<RootStackParamList, 'RunningScreen'>;

export default function RunningScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const missingDeviceId = !deviceId;
  const { assignment, finished, unsuccessful: observerTerminalUnsuccessful,
    stale: assignmentStale, retry: retryCurrentAssignment } = useAssignmentMonitor(route.params ?? {});
  const sessionId = assignment?.sessionId;

  const lessonTitle =
    assignment?.lessonTitle?.trim()
      ? assignment.lessonTitle
      : route.params?.lessonTitle?.trim()
        ? route.params.lessonTitle
        : "Today's lesson";
  const assignmentId = assignment?.assignmentId ?? route.params?.assignmentId;
  const terminalUnsuccessful = observerTerminalUnsuccessful || assignment?.state === 'FAILED' || assignment?.state === 'CANCELLED';
  const statusUnavailable = assignmentStale || missingDeviceId || terminalUnsuccessful;
  const completed = !statusUnavailable && (finished || assignment?.state === 'COMPLETED');
  const presentation = completed
    ? presentAssignmentState('COMPLETED')
    : assignment
      ? presentAssignmentState(assignment.state)
      : null;
  const statusCopy = terminalUnsuccessful
    ? 'Robot could not finish this lesson.'
    : statusUnavailable
      ? "We can't confirm the lesson on Robot yet."
    : presentation
      ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
      : 'Lesson playing';
  const statusLabel = completed ? statusCopy : terminalUnsuccessful ? 'Needs attention' : statusUnavailable ? 'Waiting' : 'Lesson playing';

  return (
    <DeviceShell title={completed ? 'Lesson finished' : statusUnavailable ? 'Lesson status unavailable' : 'Lesson is on Robot'}>
      <Box paddingTop={36} paddingHorizontal={24} alignItems="center">
        <Box style={styles.robotWrap} alignItems="center" justifyContent="center">
          <RobotDevice emotion={completed ? 'happy' : statusUnavailable ? 'think' : 'speak'} size={170} accent="#FF6F61" />
        </Box>
        <Box style={[styles.statusBadge, completed && styles.statusBadgeDone, statusUnavailable && styles.statusBadgeStale]}>
          <Box style={[styles.statusDot, completed && styles.statusDotDone, statusUnavailable && styles.statusDotStale]} />
          <Text fontWeight="700" style={[styles.statusText, completed && styles.statusTextDone, statusUnavailable && styles.statusTextStale]}>
            {statusLabel}
          </Text>
        </Box>
        <Text fontWeight="600" style={styles.heading}>{lessonTitle}</Text>
        <Text style={styles.sub}>
          {completed ? "Today's lesson is complete." : statusCopy}
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={30}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>
            {completed
              ? "You'll find today's progress on the dashboard. "
              : "You'll get a calm summary here when the lesson ends. "}
            <Text fontWeight="600" style={{ color: CL.ink }}>Audio is never saved.</Text>
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        {completed && assignmentId && deviceId && assignment?.lessonId ? (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.LessonSummaryScreen, {
            childId: assignment?.childId ?? route.params?.childId,
            assignmentId,
            deviceId,
            lessonId: assignment.lessonId,
            sessionId: sessionId ?? undefined,
          })}>
            See lesson reward
          </DeviceBigBtn>
        ) : null}
        {!completed && !statusUnavailable && (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CompanionScreen, { childId: assignment?.childId ?? route.params?.childId, deviceId, assignmentId, assignmentVersion: assignment?.assignmentVersion ?? route.params?.assignmentVersion, sessionId: sessionId ?? undefined, lessonTitle })}>
            See what's happening
          </DeviceBigBtn>
        )}
        {assignmentStale && !missingDeviceId && <DeviceBigBtn onClick={retryCurrentAssignment}>Try again</DeviceBigBtn>}
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Done for now</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  robotWrap: { width: 200, height: 200 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF4D9', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, marginTop: 14,
  },
  statusBadgeDone: { backgroundColor: '#E6F4EE' },
  statusBadgeStale: { backgroundColor: '#F2F4F7' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8A33C' },
  statusDotDone: { backgroundColor: '#1F8A5B' },
  statusDotStale: { backgroundColor: '#667085' },
  statusText: { fontSize: 11, color: '#8A6A12' },
  statusTextDone: { color: '#1F8A5B' },
  statusTextStale: { color: '#475467' },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  noteCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: CL.ink2, lineHeight: 20 },
});
