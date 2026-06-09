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
import {
  getCurrentAssignment,
  presentAssignmentState,
  type CurrentAssignment,
} from '@/services/api/course-library.api';
import { formatLessonCopy } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'RunningScreen'>;

const POLL_INTERVAL_MS = 2500;

export default function RunningScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);

  React.useEffect(() => {
    if (!deviceId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const current = await getCurrentAssignment(deviceId);
        if (!active) return;
        setAssignment(current);
        // Stop once the lesson reaches a terminal state; COMPLETED renders the
        // "Finished!" status line (the authoritative completion source is the
        // progress_events stream — this is its live projection, plan M3).
        const live = current && current.state !== 'COMPLETED' && current.state !== 'FAILED' && current.state !== 'CANCELLED';
        if (live) timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (active) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [deviceId]);

  const lessonTitle =
    assignment?.lessonTitle?.trim()
      ? assignment.lessonTitle
      : route.params?.lessonTitle?.trim()
        ? route.params.lessonTitle
        : "Today's lesson";
  const completed = assignment?.state === 'COMPLETED';
  const presentation = assignment ? presentAssignmentState(assignment.state) : null;
  const statusCopy = presentation
    ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
    : 'Lesson playing';

  return (
    <DeviceShell title={completed ? 'Lesson finished' : 'Lesson is on Robot'}>
      <Box paddingTop={36} paddingHorizontal={24} alignItems="center">
        <Box style={styles.robotWrap} alignItems="center" justifyContent="center">
          <RobotDevice emotion={completed ? 'happy' : 'speak'} size={170} accent="#FF6F61" />
        </Box>
        <Box style={[styles.statusBadge, completed && styles.statusBadgeDone]}>
          <Box style={[styles.statusDot, completed && styles.statusDotDone]} />
          <Text fontWeight="700" style={[styles.statusText, completed && styles.statusTextDone]}>
            {completed ? statusCopy : 'Lesson playing'}
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
        {!completed && (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CompanionScreen, { deviceId, assignmentId: assignment?.assignmentId })}>
            See what's happening
          </DeviceBigBtn>
        )}
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
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8A33C' },
  statusDotDone: { backgroundColor: '#1F8A5B' },
  statusText: { fontSize: 11, color: '#8A6A12' },
  statusTextDone: { color: '#1F8A5B' },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  noteCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: CL.ink2, lineHeight: 20 },
});
